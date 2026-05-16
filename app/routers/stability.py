"""
stability.py — 점수 증가/감소 이벤트 엔드포인트.

점수 변화가 발생하는 모든 곳(Han 채팅, 모임 참석 등)에서 이 엔드포인트를 호출.
미션 완료 점수는 missions.py 에서 별도 처리.

POST /stability/event/{event_type}   — 점수 증가
POST /stability/penalty/{context}    — 페널티 (ai_chat / user_chat)
GET  /stability/streak               — 스트릭 조회
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

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
    apply_moderation_penalty,
    apply_score_event,
    get_streak,
    get_trust_profile,
)
from app.services.moderation_service import run_moderation
from app.database import user_doc


class PenaltyRequest(BaseModel):
    content: Optional[str] = None          # 위반 메시지 원문 (DB 저장용)
    room_id: Optional[str] = None          # 유저 채팅 방 ID (user_chat 전용)
    moderation: Optional[dict] = None      # AI 모더레이션 결과 (선택)

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
def penalty_ai_chat(
    body: PenaltyRequest = PenaltyRequest(),
    uid: str = Depends(get_current_uid),
):
    """
    AI 대화 거친 언행 감지 시 호출.
    - content 있으면 blocked_ai_messages 컬렉션에 실제 메시지 저장
    - stability_logs에 점수 변동 기록
    - user_profiles/{uid}.ai_penalty_count 증가
    """
    return apply_penalty(
        uid, "ai_chat",
        content=body.content,
        moderation=body.moderation,
    )


@router.post("/penalty/user-chat", response_model=PenaltyEventResponse)
def penalty_user_chat(
    body: PenaltyRequest = PenaltyRequest(),
    uid: str = Depends(get_current_uid),
):
    """
    실제 유저 간 대화 위반 감지 시 호출.
    - content 있으면 blocked_chat_messages 컬렉션에 저장 (기존 형식 + uid)
    - 첫 1회: 경고(점수 차감 없음) / 이후: -40 누적 가중
    - stability_logs에 기록
    """
    return apply_penalty(
        uid, "user_chat",
        content=body.content,
        room_id=body.room_id,
        moderation=body.moderation,
    )


# ── ai_logic 모더레이션 자동 실행 엔드포인트 ─────────────────────────────────
# 기존 /penalty/* 와 달리, 메시지를 받아 자동으로 모더레이션 → 점수 차감까지 처리.

class ModerateRequest(BaseModel):
    content: str                       # 검사할 메시지 원문 (필수)
    room_id: Optional[str] = None      # 유저 채팅 방 ID (user-chat 전용)


@router.post("/moderate/ai-chat")
def moderate_and_penalize_ai_chat(
    body: ModerateRequest,
    uid: str = Depends(get_current_uid),
):
    """
    AI 채팅 메시지 모더레이션 + 점수 차감 통합 처리.
    1. ai_logic.moderation.moderate(mode='ai') 실행
    2. action에 따라 점수 자동 차감:
       warn=-5  severe_warn=-25  block=-50  crisis/allow=0
    3. blocked_ai_messages에 위반 내용 저장
    4. stability_logs에 기록

    반환: { action, delta, stability_score, stage, warning_msg, ... }
    """
    mod = run_moderation(body.content, mode="ai")
    return apply_moderation_penalty(
        uid=uid,
        moderation_result=mod,
        context="ai_chat",
        content=body.content,
    )


@router.post("/moderate/user-chat")
def moderate_and_penalize_user_chat(
    body: ModerateRequest,
    uid: str = Depends(get_current_uid),
):
    """
    유저 간 채팅 메시지 모더레이션 + 점수 차감 통합 처리 (p2p 모드 — 더 엄격).
    1. ai_logic.moderation.moderate(mode='p2p') 실행
    2. action에 따라 점수 자동 차감:
       warn=-5  severe_warn=-25  block=-50  crisis/allow=0
    3. blocked_chat_messages에 위반 내용 저장
    4. stability_logs에 기록

    반환: { action, delta, stability_score, stage, warning_msg, ... }
    """
    mod = run_moderation(body.content, mode="p2p")
    return apply_moderation_penalty(
        uid=uid,
        moderation_result=mod,
        context="user_chat",
        content=body.content,
        room_id=body.room_id,
    )


# ── 스트릭 조회 ───────────────────────────────────────────────────────────────

@router.get("/streak", response_model=StreakResponse)
def get_my_streak(uid: str = Depends(get_current_uid)):
    """연속 활동(스트릭) 조회."""
    return get_streak(uid)
