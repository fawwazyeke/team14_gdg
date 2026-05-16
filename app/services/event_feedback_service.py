from datetime import datetime, timezone
from typing import Optional

from ai_logic.fallbacks import (
    get_event_feedback_questions_fallback,
    get_event_feedback_score_fallback,
)
from ai_logic.prompts import (
    build_event_feedback_questions_prompt,
    build_event_feedback_score_prompt,
)
from app.firebase import db
from app.services.gemini_service import generate_json


def _now():
    return datetime.now(timezone.utc)


def _get_joined_event_doc(user_id: int, event_id: str):
    docs = (
        db.collection("joined_events")
        .where("user_id", "==", user_id)
        .where("event_id", "==", event_id)
        .limit(1)
        .stream()
    )

    for doc in docs:
        return doc

    return None


def _event_from_joined_event(joined_event: dict) -> dict:
    return {
        "event_id": joined_event.get("event_id"),
        "title": joined_event.get("title"),
        "category": joined_event.get("category"),
        "location": joined_event.get("location"),
        "date": joined_event.get("date"),
        "description": joined_event.get("description"),
        "keywords": joined_event.get("keywords", []),
    }


def get_joined_events(user_id: int) -> list[dict]:
    docs = (
        db.collection("joined_events")
        .where("user_id", "==", user_id)
        .stream()
    )

    events = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        events.append(data)

    return events


def start_event_feedback(
    user_id: int,
    event_id: str,
    user_profile: Optional[dict] = None,
) -> dict:
    joined_event_doc = _get_joined_event_doc(user_id, event_id)

    if joined_event_doc is None:
        return {
            "started": False,
            "reason": "joined_event_not_found",
            "message": "Joined event was not found for this user.",
        }

    joined_event = joined_event_doc.to_dict()

    if joined_event.get("feedback_status") == "completed":
        return {
            "started": False,
            "reason": "feedback_already_completed",
            "message": "Feedback for this event is already completed.",
        }

    event = _event_from_joined_event(joined_event)
    user_profile = user_profile or {}

    prompt = build_event_feedback_questions_prompt(
        event=event,
        user_profile=user_profile,
    )

    result = generate_json(prompt=prompt)

    if not result or "questions" not in result:
        result = get_event_feedback_questions_fallback()

    questions = result.get("questions", [])[:4]

    if len(questions) < 4:
        fallback_questions = get_event_feedback_questions_fallback()["questions"]
        questions = (questions + fallback_questions)[:4]

    session_ref = db.collection("event_feedback_sessions").document()

    session = {
        "session_id": session_ref.id,
        "user_id": user_id,
        "event_id": event_id,
        "event": event,
        "questions": questions,
        "answers": [],
        "current_question_index": 0,
        "status": "in_progress",
        "created_at": _now(),
        "updated_at": _now(),
        "completed_at": None,
    }

    session_ref.set(session)

    joined_event_doc.reference.set(
        {
            "feedback_status": "in_progress",
            "feedback_session_id": session_ref.id,
            "updated_at": _now(),
        },
        merge=True,
    )

    return {
        "started": True,
        "session_id": session_ref.id,
        "event_id": event_id,
        "current_question_index": 0,
        "question": questions[0],
        "total_questions": len(questions),
    }


def submit_event_feedback_answer(
    user_id: int,
    event_id: str,
    session_id: str,
    answer: str,
) -> dict:
    session_ref = db.collection("event_feedback_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        return {
            "saved": False,
            "reason": "session_not_found",
            "message": "Feedback session was not found.",
        }

    session = session_doc.to_dict()

    if session.get("user_id") != user_id or session.get("event_id") != event_id:
        return {
            "saved": False,
            "reason": "session_mismatch",
            "message": "This feedback session does not match the user or event.",
        }

    if session.get("status") == "completed":
        return {
            "saved": False,
            "reason": "session_already_completed",
            "message": "This feedback session is already completed.",
        }

    questions = session.get("questions", [])
    current_index = session.get("current_question_index", 0)

    if current_index >= len(questions):
        return {
            "saved": False,
            "reason": "no_remaining_questions",
            "message": "There are no remaining questions.",
        }

    answers = session.get("answers", [])
    answers.append(
        {
            "question_index": current_index,
            "question": questions[current_index],
            "answer": answer,
            "answered_at": _now(),
        }
    )

    next_index = current_index + 1

    update_data = {
        "answers": answers,
        "current_question_index": next_index,
        "updated_at": _now(),
    }

    if next_index >= len(questions):
        update_data["status"] = "ready_to_complete"

    session_ref.update(update_data)

    if next_index >= len(questions):
        return {
            "saved": True,
            "status": "ready_to_complete",
            "message": "All questions answered. Please complete feedback scoring.",
        }

    return {
        "saved": True,
        "status": "in_progress",
        "next_question_index": next_index,
        "next_question": questions[next_index],
        "remaining_questions": len(questions) - next_index,
    }


def complete_event_feedback(
    user_id: int,
    event_id: str,
    session_id: str,
    user_profile: Optional[dict] = None,
) -> dict:
    session_ref = db.collection("event_feedback_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        return {
            "completed": False,
            "reason": "session_not_found",
            "message": "Feedback session was not found.",
        }

    session = session_doc.to_dict()

    if session.get("user_id") != user_id or session.get("event_id") != event_id:
        return {
            "completed": False,
            "reason": "session_mismatch",
            "message": "This feedback session does not match the user or event.",
        }

    answers = session.get("answers", [])
    questions = session.get("questions", [])

    if len(answers) < len(questions):
        return {
            "completed": False,
            "reason": "not_enough_answers",
            "message": "Please answer all feedback questions before completing.",
            "answered_count": len(answers),
            "total_questions": len(questions),
        }

    event = session.get("event", {})
    user_profile = user_profile or {}

    prompt = build_event_feedback_score_prompt(
        event=event,
        answers=answers,
        user_profile=user_profile,
    )

    result = generate_json(prompt=prompt)

    if not result or "social_score" not in result:
        result = get_event_feedback_score_fallback()

    social_score = int(result.get("social_score", 5))
    social_score = max(1, min(10, social_score))

    result["social_score"] = social_score

    result_ref = db.collection("event_feedback_results").document(session_id)
    result_ref.set(
        {
            "session_id": session_id,
            "user_id": user_id,
            "event_id": event_id,
            "event": event,
            "social_score": social_score,
            "summary": result.get("summary"),
            "strengths": result.get("strengths", []),
            "growth_points": result.get("growth_points", []),
            "recommended_next_action": result.get("recommended_next_action"),
            "created_at": _now(),
        }
    )

    session_ref.update(
        {
            "status": "completed",
            "completed_at": _now(),
            "updated_at": _now(),
        }
    )

    joined_event_doc = _get_joined_event_doc(user_id, event_id)
    if joined_event_doc is not None:
        joined_event_doc.reference.set(
            {
                "feedback_status": "completed",
                "feedback_score": social_score,
                "feedback_result_id": session_id,
                "updated_at": _now(),
            },
            merge=True,
        )

    # TODO: Core Backend 담당자와 기존 social score 저장 위치 합의 후 반영.
    # 예: users/{user_id}.social_score 또는 user_profiles/{user_id}.social_score 업데이트

    return {
        "completed": True,
        "event_id": event_id,
        "session_id": session_id,
        "social_score": social_score,
        "summary": result.get("summary"),
        "strengths": result.get("strengths", []),
        "growth_points": result.get("growth_points", []),
        "recommended_next_action": result.get("recommended_next_action"),
    }