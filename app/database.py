"""데이터베이스 레이어 — Firestore.

Firestore 컬렉션 구조 (성진 담당):
  user_profiles/{uid}
    필드:
      nickname, country, language, stability_score, stage,
      interests, communication_style, age, created_at
      streak_count, last_activity_date, score_bar_visible
      ai_penalty_count, user_penalty_count, user_warning_given

  user_profiles/{uid}/stability_logs/{id}
  user_profiles/{uid}/missions/{id}
  user_profiles/{uid}/mission_records/{id}
  user_profiles/{uid}/onboarding_answers/{id}   ← 온보딩 서베이

최상위 위반 로그 컬렉션:
  blocked_ai_messages/{id}    ← AI 채팅 거친 언동
  blocked_chat_messages/{id}  ← 유저 간 채팅 위반

건드리지 않는 컬렉션 (다른 팀원 담당):
  users/{uid}        ← fawwaz 로그인/프로필
  events/{id}        ← fawwaz 이벤트 파이프라인
  ai_chat_messages/  ← Han AI 채팅
  chat_rooms/        ← Han 유저간 채팅
  friendships/       ← Han 친구 관계 (unfriend 삭제 시에만 접근)
"""
from app.firebase import get_firestore

# 컬렉션 이름 상수
COL_USER_PROFILES        = "user_profiles"
COL_STABILITY_LOGS       = "stability_logs"
COL_MISSIONS             = "missions"
COL_MISSION_RECORDS      = "mission_records"
COL_ONBOARDING_ANSWERS   = "onboarding_answers"
COL_BLOCKED_CHAT_MESSAGES   = "blocked_chat_messages"
COL_BLOCKED_AI_MESSAGES     = "blocked_ai_messages"
COL_FRIENDSHIPS             = "friendships"
COL_EVENT_PARTICIPATIONS    = "event_participations"
COL_EVENT_FEEDBACK_MESSAGES = "feedback_messages"


def user_profiles_col():
    return get_firestore().collection(COL_USER_PROFILES)


def user_doc(uid: str):
    return user_profiles_col().document(uid)


def stability_logs_col(uid: str):
    return user_doc(uid).collection(COL_STABILITY_LOGS)


def missions_col(uid: str):
    return user_doc(uid).collection(COL_MISSIONS)


def mission_records_col(uid: str):
    return user_doc(uid).collection(COL_MISSION_RECORDS)


def onboarding_col(uid: str):
    """온보딩 서베이 답변."""
    return user_doc(uid).collection(COL_ONBOARDING_ANSWERS)


# ── 위반/차단 메시지 최상위 컬렉션 ──────────────────────────────────────────

def blocked_chat_messages_col():
    """유저 간 채팅 위반 메시지. 성진: penalty 연동 시 uid 필드 추가."""
    return get_firestore().collection(COL_BLOCKED_CHAT_MESSAGES)


def blocked_ai_messages_col():
    """AI 채팅 거친 언동 로그."""
    return get_firestore().collection(COL_BLOCKED_AI_MESSAGES)


# ── Han 담당 컬렉션 — unfriend 삭제 시에만 접근 ──────────────────────────────

def friendships_col():
    """Han이 관리하는 friendships 컬렉션. unfriend 시에만 사용."""
    return get_firestore().collection(COL_FRIENDSHIPS)


# ── Event participation ───────────────────────────────────────────────────────

def _participation_id(uid: str, event_id: str) -> str:
    return f"{uid}__{event_id}"


def event_participations_col():
    return get_firestore().collection(COL_EVENT_PARTICIPATIONS)


def event_participation_doc(uid: str, event_id: str):
    return event_participations_col().document(_participation_id(uid, event_id))


def event_feedback_messages_col(uid: str, event_id: str):
    return event_participation_doc(uid, event_id).collection(COL_EVENT_FEEDBACK_MESSAGES)
