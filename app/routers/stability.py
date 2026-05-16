"""
stability.py — 점수 증가/감소 이벤트 엔드포인트.

점수 변화가 발생하는 모든 곳(Han 채팅, 모임 참석 등)에서 이 엔드포인트를 호출.
미션 완료 점수는 missions.py 에서 별도 처리.

POST /stability/event/{event_type}   — 점수 증가
POST /stability/penalty/{context}    — 페널티 (ai_chat / user_chat)
GET  /stability/streak               — 스트릭 조회
"""

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_uid
from app.schemas import (
    GatheringAttendRequest,
    PenaltyEventResponse,
    SCORE_DELTA,
    ScoreEventResponse,
    StreakResponse,
    UNLOCK_THRESHOLD,
)
from app.services.stability_service import (
    apply_penalty,
    apply_score_event,
    get_streak,
    get_trust_profile,
)
from app.database import user_doc

router = APIRouter()


# ── 점수 증가 ─────────────────────────────────────────────────────────────────

@router.post("/event/ai-chat", response_model=ScoreEventResponse)
def event_ai_chat(uid: str = Depends(get_current_uid)):
    """AI와 대화 1회 — +0.5점 + 스트릭 갱신."""
    return apply_score_event(uid, "ai_chat")


@router.post("/event/user-chat", response_model=ScoreEventResponse)
def event_user_chat(uid: str = Depends(get_current_uid)):
    """
    사람과 대화 1인당 — +5점 + 스트릭 갱신.
    해금 기준: 60점 이상.
    Han 채팅 서비스에서 상대방 uid 별로 1회 호출.
    """
    snap = user_doc(uid).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found")
    score = float(snap.to_dict().get("stability_score", 0))
    if score < UNLOCK_THRESHOLD["user_chat"]:
        raise HTTPException(
            status_code=403,
            detail=f"사람과의 대화는 {UNLOCK_THRESHOLD['user_chat']}점 이상부터 가능합니다. "
                   f"현재: {score:.1f}점",
        )

    # 신뢰도 체크
    trust = get_trust_profile(uid)
    if not trust["is_trusted"]:
        raise HTTPException(
            status_code=403,
            detail="AI 대화에서 페널티가 누적되어 실제 사용자와의 대화가 제한됩니다.",
        )

    return apply_score_event(uid, "user_chat_per_person")


@router.post("/event/friend-added", response_model=ScoreEventResponse)
def event_friend_added(uid: str = Depends(get_current_uid)):
    """친구 추가 — +4점."""
    return apply_score_event(uid, "friend_added")


@router.post("/event/gathering", response_model=ScoreEventResponse)
def event_gathering_attend(
    body: GatheringAttendRequest,
    uid: str = Depends(get_current_uid),
):
    """
    실제 모임 참석 — +50점 + 스트릭 갱신.
    해금 기준: 100점 이상.
    """
    snap = user_doc(uid).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found")
    score = float(snap.to_dict().get("stability_score", 0))
    if score < UNLOCK_THRESHOLD["gathering"]:
        raise HTTPException(
            status_code=403,
            detail=f"실제 모임 참석은 {UNLOCK_THRESHOLD['gathering']}점 이상부터 가능합니다. "
                   f"현재: {score:.1f}점",
        )
    return apply_score_event(uid, "gathering_attend")


# ── 페널티 ────────────────────────────────────────────────────────────────────

@router.post("/penalty/ai-chat", response_model=PenaltyEventResponse)
def penalty_ai_chat(uid: str = Depends(get_current_uid)):
    """
    AI 대화 거친 언행 감지 시 호출.
    Han/AI 채팅 서비스에서 detect_toxicity_ai_chat() 결과가 is_toxic=True 일 때.
    """
    return apply_penalty(uid, "ai_chat")


@router.post("/penalty/user-chat", response_model=PenaltyEventResponse)
def penalty_user_chat(uid: str = Depends(get_current_uid)):
    """
    실제 유저 간 대화 위반 감지 시 호출.
    첫 1회: 경고(점수 차감 없음). 이후: -40 누적 가중.
    """
    return apply_penalty(uid, "user_chat")


# ── 스트릭 조회 ───────────────────────────────────────────────────────────────

@router.get("/streak", response_model=StreakResponse)
def get_my_streak(uid: str = Depends(get_current_uid)):
    """연속 활동(스트릭) 조회."""
    return get_streak(uid)
