"""Pydantic 스키마 — Firestore 기반.

user_id는 Firebase UID (str) 사용.
Event/로그인 관련 스키마는 fawwaz 담당이므로 제외.
"""
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel

VALID_DIFFICULTIES = {"easy", "normal", "hard"}
VALID_VERIFICATION_TYPES = {"text", "photo"}  # AI 미션은 None (nullable)

# 스테이지 기준점 (해금 기준과 동기화)
STAGE_THRESHOLDS = {
    "AI_START": 0,
    "MISSION_PRACTICE": 36,
    "READY_TO_CONNECT": 60,
    "CONNECTING": 100,
    "READY_TO_CONNECT": 60,   # 사람과 대화 해금
    "CONNECTING": 100,         # 실제 모임 해금
}

# ── Score System ───────────────────────────────────────────────────────────────

SCORE_DELTA = {
    "ai_chat":              0.5,
    "mission_complete":     1.0,
    "ai_mission_complete":  1.5,
    "user_chat_per_person": 5.0,
    "friend_added":         4.0,
    "gathering_attend":     20.0,
}

# Event feedback reflection score: Gemini rates 0-10, maps to these deltas
EVENT_FEEDBACK_SCORE_MAP = [
    (9, 8.0),   # 9-10 → +8  (deep, meaningful reflection)
    (6, 5.0),   # 6-8  → +5  (good reflection)
    (3, 3.0),   # 3-5  → +3  (some reflection)
    (0, 1.0),   # 0-2  → +1  (minimal / showed up)
]

def event_feedback_delta(reflection_score: int) -> float:
    """Map Gemini 0-10 reflection score to stability delta."""
    for threshold, delta in EVENT_FEEDBACK_SCORE_MAP:
        if reflection_score >= threshold:
            return delta
    return 1.0

UNLOCK_THRESHOLD = {
    "user_chat": 60,
    "gathering": 100,
}

PENALTY_BASE = {
    "ai_chat_rough":       0.1,
    "user_chat_violation": 40.0,
}

AI_PENALTY_TRUST_THRESHOLD = 5

# ── Badge System ───────────────────────────────────────────────────────────────

# 점수 증가량
SCORE_DELTA = {
    "ai_chat":              0.5,   # AI와 대화 1회
    "mission_complete":     1.0,   # 기본 미션 완료
    "ai_mission_complete":  1.5,   # AI 개인화 미션 완료
    "user_chat_per_person": 5.0,   # 사람과 대화 (1인당, 익명)
    "friend_added":         4.0,   # 새 친구 추가
    "gathering_attend":     20.0,  # 실제 모임 참석
}

# 기능 해금 점수 기준
UNLOCK_THRESHOLD = {
    "user_chat": 60,    # 사람과 대화 해금
    "gathering": 100,   # 실제 모임 참석 해금
}

# 페널티 기준량 (cumulative 가중 적용됨)
PENALTY_BASE = {
    "ai_chat_rough":       0.1,   # AI 대화 거친 언행 기본값
    "user_chat_violation": 40.0,  # 실제 대화 위반 (1회=경고, 이후 차감)
}

# AI 페널티 누적 횟수 기준 — 이 이상이면 신뢰도 낮음
AI_PENALTY_TRUST_THRESHOLD = 5


# ── Badge System ───────────────────────────────────────────────────────────────

# (threshold, badge_name) — 높은 순서로 정렬
BADGE_THRESHOLDS = [
    (1000, "높은음자리표"),
    (500,  "가온음자리표"),
    (100,  "낮은음자리표"),
]


def score_to_badge(score: float) -> Optional[str]:
    """100점 미만 → None, 100~499 → 낮은음자리표, 500~999 → 가온음자리표, 1000+ → 높은음자리표."""
    for threshold, name in BADGE_THRESHOLDS:
        if score >= threshold:
            return name
    return None


def badge_next_info(score: float) -> dict:
    for threshold, name in reversed(BADGE_THRESHOLDS):
        if score < threshold:
            return {
                "next_badge": name,
                "next_badge_threshold": threshold,
                "points_needed": round(threshold - score, 2),
            }
    """다음 뱃지 이름과 필요 점수 반환. 최고 단계이면 next_badge=None."""
    current = score_to_badge(score)
    for threshold, name in reversed(BADGE_THRESHOLDS):
        if score < threshold:
            return {"next_badge": name, "next_badge_threshold": threshold, "points_needed": round(threshold - score, 2)}
    return {"next_badge": None, "next_badge_threshold": None, "points_needed": 0}


def score_to_stage(score: float) -> str:
    if score >= 100:
        return "CONNECTING"
    if score >= 60:
        return "READY_TO_CONNECT"
    if score >= 36:
        return "MISSION_PRACTICE"
    return "AI_START"


# ── User Profile ───────────────────────────────────────────────────────────────

class UserProfileCreate(BaseModel):
    nickname: str
    country: str
    language: str
    interests: Optional[List[str]] = None
    communication_style: Optional[str] = None
    age: Optional[int] = None


class UserProfileResponse(BaseModel):
    uid: str
    nickname: str
    country: str
    language: str
    stability_score: float
    stability_score: float       # float: +0.5 단위 지원
    stage: str
    interests: Optional[Any] = None
    communication_style: Optional[str] = None
    age: Optional[int] = None
    created_at: datetime
    streak_count: int = 0
    score_bar_visible: bool = False


class UserStatusResponse(BaseModel):
    uid: str
    stability_score: float
    stage: str
    can_use_ai_chat: bool
    can_do_missions: bool
    can_recommend_users: bool
    can_access_events: bool
    can_chat_with_users: bool
    can_access_gatherings: bool = False
    stability_score: float       # float: +0.5 단위 지원
    stage: str
    # 기능 잠금 해제 플래그
    can_use_ai_chat: bool        # AI_START 이상 (항상 true)
    can_do_missions: bool        # MISSION_PRACTICE 이상 (score >= 36)
    can_recommend_users: bool    # READY_TO_CONNECT 이상 (score >= 61)
    can_access_events: bool      # READY_TO_CONNECT 이상 (score >= 61)
    can_chat_with_users: bool    # score >= 60 (사람과 대화 해금)
    can_access_gatherings: bool  # score >= 100 (실제 모임 참석 해금)


# ── Survey (온보딩) ────────────────────────────────────────────────────────────

class SurveyAnswerItem(BaseModel):
    question_key: str
    answer: str
    score: int


class SurveyRequest(BaseModel):
    answers: List[SurveyAnswerItem]


class SurveyResponse(BaseModel):
    uid: str
    stability_score: float
    stage: str


# ── Mission ────────────────────────────────────────────────────────────────────

class MissionCreate(BaseModel):
    title: str
    description: str
    difficulty: str
    verification_type: Optional[str] = None
    verification_type: Optional[str] = None  # "text" | "photo" | None (AI 미션)
    stability_delta: int = 0
    is_ai_generated: bool = False


class MissionResponse(BaseModel):
    id: str
    uid: str
    title: str
    description: str
    difficulty: str
    category: str = "wellness"
    verification_type: Optional[str] = None
    verification_type: Optional[str] = None  # AI 미션은 null
    is_ai_generated: bool
    status: str
    stability_delta: float
    created_at: datetime
    completed_at: Optional[datetime] = None


class MissionCompleteRequest(BaseModel):
    # 기본 미션: verification_type에 따라 text 또는 image_url 필수
    # AI 미션: 둘 다 nullable
    text: Optional[str] = None
    image_url: Optional[str] = None


class MissionCompleteResponse(BaseModel):
    mission_id: str
    status: str
    stability_score: float
    stage: str
    total_delta: int
    verified: bool
    verified: bool  # 인증 여부


class TodayMissionData(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    verification_type: Optional[str] = None
    is_ai_generated: bool
    status: str
    stability_delta: int


class TodayMissionResponse(BaseModel):
    mission: Optional[TodayMissionData] = None


# ── Mission Record ─────────────────────────────────────────────────────────────

class RecordResponse(BaseModel):
    id: str
    uid: str
    mission_id: str
    image_url: Optional[str] = None
    text: Optional[str] = None
    created_at: datetime


class RecordWithMissionResponse(BaseModel):
    id: str
    mission_id: str
    mission_title: str
    image_url: Optional[str] = None
    text: Optional[str] = None
    created_at: datetime


# Chat 관련 스키마는 Han 담당 (ai_chat_messages, chat_rooms, friendships)

# ── Score Events ───────────────────────────────────────────────────────────────

class ScoreEventResponse(BaseModel):
    uid: str
    event: str
    delta: float
    stability_score: float
    stage: str
    streak_count: int


class StreakResponse(BaseModel):
    uid: str
    streak_count: int
    last_activity_date: Optional[str] = None


class TrustProfileResponse(BaseModel):
    uid: str
    is_trusted: bool
    ai_penalty_count: int
    user_penalty_count: int
    user_warning_given: bool
    """유저가 실제 대화에서 안전한지 보증하는 신뢰 프로파일."""
    uid: str
    is_trusted: bool            # ai_penalty_count < AI_PENALTY_TRUST_THRESHOLD
    ai_penalty_count: int       # AI 대화 거친 언행 누적 횟수
    user_penalty_count: int     # 실제 대화 위반 누적 횟수
    user_warning_given: bool    # 실제 대화 경고 1회 소진 여부


class ScoreBarToggleResponse(BaseModel):
    uid: str
    score_bar_visible: bool


class PenaltyEventResponse(BaseModel):
    uid: str
    context: str
    action: str
    delta: float
    context: str                # "ai_chat" | "user_chat"
    action: str                 # "penalized" | "warned"
    delta: float                # 차감량 (경고 시 0.0)
    stability_score: float
    stage: str
    ai_penalty_count: int
    user_penalty_count: int
    message: str


# ── Friends ────────────────────────────────────────────────────────────────────

class AnonymousNameResponse(BaseModel):
    friend_uid: str
    anonymous_name: str


class FriendUnfriendResponse(BaseModel):
    success: bool
    message: str


# ── Gatherings ────────────────────────────────────────────────────────────────

class GatheringAttendRequest(BaseModel):
    gathering_id: str


# ── Badge ─────────────────────────────────────────────────────────────────────

class BadgeResponse(BaseModel):
    uid: str
    stability_score: float
    badge: Optional[str]
    next_badge: Optional[str]
    next_badge_threshold: Optional[int]
    points_needed: float


# ── Moderation ────────────────────────────────────────────────────────────────

class ModerationResult(BaseModel):
    is_toxic: bool
    severity: int
    reason: Optional[str] = None


# ── Event Participation ───────────────────────────────────────────────────────

class EventJoinRequest(BaseModel):
    event_title: str
    event_start_at: str      # ISO string from the Event model
    event_city: str = ""


class EventParticipationResponse(BaseModel):
    uid: str
    event_id: str
    event_title: str
    event_start_at: str
    event_city: str
    joined_at: datetime
    feedback_completed: bool
    feedback_score: Optional[int] = None
    feedback_delta: Optional[float] = None


class EventFeedbackMessageRequest(BaseModel):
    message: str


class EventFeedbackMessageResponse(BaseModel):
    reply: str
    message_count: int


class EventFeedbackCompleteResponse(BaseModel):
    uid: str
    event_id: str
    reflection_score: int    # 0-10 Gemini rating
    delta: float
    stability_score: float
    stage: str
    summary: str             # Gemini's brief summary of the reflection


# Chat 관련 스키마는 Han 담당 (ai_chat_messages, chat_rooms, friendships)
    badge: Optional[str]              # None | "낮은음자리표" | "가온음자리표" | "높은음자리표"
    next_badge: Optional[str]         # 다음 뱃지 이름 (최고 단계면 None)
    next_badge_threshold: Optional[int]  # 다음 뱃지 필요 점수
    points_needed: float              # 다음 뱃지까지 남은 점수 (최고 단계면 0)


# ── Moderation (AI 담당자 연동용) ─────────────────────────────────────────────

class ModerationResult(BaseModel):
    is_toxic: bool
    severity: int       # 0=clean, 1=mild(경고), 2=severe(차감)
    reason: Optional[str] = None
