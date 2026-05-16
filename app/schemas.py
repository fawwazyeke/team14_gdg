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

BADGE_THRESHOLDS = [
    (1000, "높은음자리표"),
    (500,  "가온음자리표"),
    (100,  "낮은음자리표"),
]


def score_to_badge(score: float) -> Optional[str]:
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
    stability_delta: int = 0
    is_ai_generated: bool = False


class MissionResponse(BaseModel):
    id: str
    uid: str
    title: str
    description: str
    difficulty: str
    verification_type: Optional[str] = None
    is_ai_generated: bool
    status: str
    stability_delta: int
    created_at: datetime
    completed_at: Optional[datetime] = None


class MissionCompleteRequest(BaseModel):
    text: Optional[str] = None
    image_url: Optional[str] = None


class MissionCompleteResponse(BaseModel):
    mission_id: str
    status: str
    stability_score: float
    stage: str
    total_delta: int
    verified: bool


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


class ScoreBarToggleResponse(BaseModel):
    uid: str
    score_bar_visible: bool


class PenaltyEventResponse(BaseModel):
    uid: str
    context: str
    action: str
    delta: float
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


# Chat 관련 스키마는 Han 담당 (ai_chat_messages, chat_rooms, friendships)
