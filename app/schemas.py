"""Pydantic 스키마 — Firestore 기반.

user_id는 Firebase UID (str) 사용.
Event/로그인 관련 스키마는 fawwaz 담당이므로 제외.
"""
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel

VALID_DIFFICULTIES = {"easy", "normal", "hard"}
VALID_VERIFICATION_TYPES = {"none", "text", "photo"}

# 스테이지 기준점
STAGE_THRESHOLDS = {
    "AI_START": 0,
    "MISSION_PRACTICE": 36,
    "READY_TO_CONNECT": 61,
    "CONNECTING": 81,
}


def score_to_stage(score: int) -> str:
    if score >= 81:
        return "CONNECTING"
    if score >= 61:
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


class UserProfileResponse(BaseModel):
    uid: str
    nickname: str
    country: str
    language: str
    stability_score: int
    stage: str
    interests: Optional[Any] = None
    communication_style: Optional[str] = None
    created_at: datetime


class UserStatusResponse(BaseModel):
    uid: str
    stability_score: int
    stage: str
    # 기능 잠금 해제 플래그
    can_use_ai_chat: bool        # AI_START 이상 (항상 true)
    can_do_missions: bool        # MISSION_PRACTICE 이상 (score >= 36)
    can_recommend_users: bool    # READY_TO_CONNECT 이상 (score >= 61)
    can_access_events: bool      # READY_TO_CONNECT 이상 (score >= 61)
    can_chat_with_users: bool    # CONNECTING (score >= 81)


# ── Survey (온보딩) ────────────────────────────────────────────────────────────

class SurveyAnswerItem(BaseModel):
    question_key: str
    answer: str
    score: int


class SurveyRequest(BaseModel):
    answers: List[SurveyAnswerItem]


class SurveyResponse(BaseModel):
    uid: str
    stability_score: int
    stage: str


# ── Mission ────────────────────────────────────────────────────────────────────

class MissionCreate(BaseModel):
    title: str
    description: str
    difficulty: str
    verification_type: str
    stability_delta: int = 0


class MissionResponse(BaseModel):
    id: str
    uid: str
    title: str
    description: str
    difficulty: str
    verification_type: str
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
    stability_score: int
    stage: str
    total_delta: int


class TodayMissionData(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    verification_type: str
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


# ── Chat ───────────────────────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    reply: str
    detected_emotion: Optional[str] = None
    suggested_next_action: Optional[str] = None


class ChatHistoryItem(BaseModel):
    id: str
    role: str           # "user" | "ai"
    message: str
    detected_emotion: Optional[str] = None
    created_at: datetime


# AI가 대화에서 추론한 유저 특성 (chat_profile)
class ChatProfileResponse(BaseModel):
    interests: List[str] = []
    social_style: Optional[str] = None
    conversation_style: Optional[str] = None
    loneliness_level: Optional[str] = None
    task_preference: List[str] = []
    updated_at: Optional[datetime] = None
