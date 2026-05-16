from datetime import datetime, timezone
from typing import Literal, List

from fastapi import APIRouter, HTTPException, Query, Depends

from app.database import (
    event_feedback_messages_col,
    event_participation_doc,
    event_participations_col,
)
from app.dependencies import get_current_uid
from app.models import ts_to_dt
from app.schemas import (
    EventFeedbackCompleteResponse,
    EventFeedbackMessageRequest,
    EventFeedbackMessageResponse,
    EventJoinRequest,
    EventParticipationResponse,
    event_feedback_delta,
    score_to_stage,
)
from app.services.event_service import (
    Event,
    EventQuery,
    EventRefreshResult,
    get_event,
    list_events,
    refresh_events,
)
from app.services.gemini_service import generate_json
from app.services.stability_service import _get_profile, _write_stability_log
from ai_logic.prompts import (
    EVENT_FEEDBACK_SYSTEM_PROMPT,
    build_event_feedback_prompt,
    build_event_reflection_score_prompt,
)

router = APIRouter()


# ── Public event listing ──────────────────────────────────────────────────────

@router.get("", response_model=list[Event])
async def read_events(
    city: Literal["seoul", "tokyo"] | None = None,
    category: str | None = None,
    q: str | None = None,
    free_only: bool = False,
    min_social_score: int = Query(default=1, ge=1, le=5),
):
    return await list_events(
        EventQuery(
            city=city,
            category=category,
            q=q,
            free_only=free_only,
            min_social_score=min_social_score,
        )
    )


# ── Participation — must come before /{event_id} to avoid route clash ─────────

@router.get("/my", response_model=List[EventParticipationResponse])
def get_my_participations(uid: str = Depends(get_current_uid)):
    """Return all events this user has joined."""
    from google.cloud.firestore_v1.base_query import FieldFilter
    docs = event_participations_col().where(
        filter=FieldFilter("uid", "==", uid)
    ).stream()

    results = []
    for doc in docs:
        d = doc.to_dict()
        results.append(EventParticipationResponse(
            uid=d["uid"],
            event_id=d["event_id"],
            event_title=d["event_title"],
            event_start_at=d["event_start_at"],
            event_city=d.get("event_city", ""),
            joined_at=ts_to_dt(d["joined_at"]),
            feedback_completed=d.get("feedback_completed", False),
            feedback_score=d.get("feedback_score"),
            feedback_delta=d.get("feedback_delta"),
        ))

    results.sort(key=lambda x: x.joined_at, reverse=True)
    return results


@router.post("/{event_id}/join", response_model=EventParticipationResponse)
async def join_event(
    event_id: str,
    body: EventJoinRequest,
    uid: str = Depends(get_current_uid),
):
    """Record that this user is joining an event. Idempotent."""
    doc_ref = event_participation_doc(uid, event_id)
    existing = doc_ref.get()

    if existing.exists:
        d = existing.to_dict()
        return EventParticipationResponse(
            uid=d["uid"],
            event_id=d["event_id"],
            event_title=d["event_title"],
            event_start_at=d["event_start_at"],
            event_city=d.get("event_city", ""),
            joined_at=ts_to_dt(d["joined_at"]),
            feedback_completed=d.get("feedback_completed", False),
            feedback_score=d.get("feedback_score"),
            feedback_delta=d.get("feedback_delta"),
        )

    now = datetime.now(timezone.utc)
    data = {
        "uid": uid,
        "event_id": event_id,
        "event_title": body.event_title,
        "event_start_at": body.event_start_at,
        "event_city": body.event_city,
        "joined_at": now,
        "feedback_completed": False,
        "feedback_score": None,
        "feedback_delta": None,
    }
    doc_ref.set(data)

    return EventParticipationResponse(
        uid=uid,
        event_id=event_id,
        event_title=body.event_title,
        event_start_at=body.event_start_at,
        event_city=body.event_city,
        joined_at=now,
        feedback_completed=False,
    )


@router.delete("/{event_id}/join", status_code=204)
def unjoin_event(event_id: str, uid: str = Depends(get_current_uid)):
    """Cancel participation (only if feedback not yet completed)."""
    doc_ref = event_participation_doc(uid, event_id)
    snap = doc_ref.get()
    if not snap.exists:
        return
    if snap.to_dict().get("feedback_completed"):
        raise HTTPException(status_code=400, detail="Cannot unjoin after completing feedback.")
    doc_ref.delete()


# ── Feedback chat ─────────────────────────────────────────────────────────────

@router.post("/{event_id}/feedback/message", response_model=EventFeedbackMessageResponse)
def send_feedback_message(
    event_id: str,
    body: EventFeedbackMessageRequest,
    uid: str = Depends(get_current_uid),
):
    """Send one message in the post-event reflection chat. Returns Do's reply."""
    doc_ref = event_participation_doc(uid, event_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="You have not joined this event.")

    participation = snap.to_dict()
    if participation.get("feedback_completed"):
        raise HTTPException(status_code=400, detail="Feedback already completed for this event.")

    event_title = participation["event_title"]
    messages_col = event_feedback_messages_col(uid, event_id)

    # Load existing conversation
    history = [
        {"role": d.to_dict()["role"], "content": d.to_dict()["content"]}
        for d in messages_col.order_by("created_at").stream()
    ]

    # Build prompt and call Gemini
    prompt = build_event_feedback_prompt(
        event_title=event_title,
        conversation_history=history,
        user_message=body.message,
    )
    result = generate_json(prompt=prompt, system_instruction=EVENT_FEEDBACK_SYSTEM_PROMPT)
    reply = (result or {}).get("reply") or "I'd love to hear more — how did it go for you?"

    now = datetime.now(timezone.utc)

    # Persist user message + assistant reply
    messages_col.add({"role": "user", "content": body.message, "created_at": now})
    messages_col.add({"role": "assistant", "content": reply, "created_at": now})

    return EventFeedbackMessageResponse(
        reply=reply,
        message_count=len(history) + 2,
    )


@router.post("/{event_id}/feedback/complete", response_model=EventFeedbackCompleteResponse)
def complete_feedback(
    event_id: str,
    uid: str = Depends(get_current_uid),
):
    """
    Finalise the reflection session. Gemini scores the conversation,
    awards a stability delta (no penalty path), and marks feedback done.
    """
    doc_ref = event_participation_doc(uid, event_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="You have not joined this event.")

    participation = snap.to_dict()
    if participation.get("feedback_completed"):
        raise HTTPException(status_code=400, detail="Feedback already completed.")

    event_title = participation["event_title"]
    messages_col = event_feedback_messages_col(uid, event_id)

    history = [
        {"role": d.to_dict()["role"], "content": d.to_dict()["content"]}
        for d in messages_col.order_by("created_at").stream()
    ]

    # Need at least one user message to score
    user_messages = [m for m in history if m["role"] == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="Share at least one reflection before completing.")

    # Score the conversation
    score_prompt = build_event_reflection_score_prompt(
        event_title=event_title,
        conversation_history=history,
    )
    score_result = generate_json(prompt=score_prompt) or {}
    reflection_score = max(0, min(10, int(score_result.get("reflection_score", 3))))
    summary = score_result.get("summary", "The user reflected on their event experience.")

    delta = event_feedback_delta(reflection_score)

    # Apply score to user profile (no penalty branch here)
    profile_data, profile_ref = _get_profile(uid)
    current_score = float(profile_data.get("stability_score", 0))
    new_score = round(current_score + delta, 2)
    new_stage = score_to_stage(new_score)

    profile_ref.update({"stability_score": new_score, "stage": new_stage})
    _write_stability_log(uid, delta, f"event_feedback:{event_id}:{reflection_score}", new_score)

    # Mark participation complete
    doc_ref.update({
        "feedback_completed": True,
        "feedback_score": reflection_score,
        "feedback_delta": delta,
        "completed_at": datetime.now(timezone.utc),
    })

    return EventFeedbackCompleteResponse(
        uid=uid,
        event_id=event_id,
        reflection_score=reflection_score,
        delta=delta,
        stability_score=new_score,
        stage=new_stage,
        summary=summary,
    )


@router.get("/{event_id}/feedback/messages")
def get_feedback_messages(event_id: str, uid: str = Depends(get_current_uid)):
    """Return existing feedback conversation for this event."""
    doc_ref = event_participation_doc(uid, event_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="You have not joined this event.")

    messages = [
        {"role": d.to_dict()["role"], "content": d.to_dict()["content"]}
        for d in event_feedback_messages_col(uid, event_id).order_by("created_at").stream()
    ]
    return {"messages": messages}


# ── Single event lookup + cache refresh ───────────────────────────────────────

@router.get("/{event_id}", response_model=Event)
async def read_event(event_id: str):
    event = await get_event(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/refresh", response_model=EventRefreshResult)
async def refresh_event_cache(from_date: str | None = None, to_date: str | None = None):
    return await refresh_events(from_date=from_date, to_date=to_date)
