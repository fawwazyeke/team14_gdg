"""데이터베이스 레이어 — Firestore.

Firestore 컬렉션 구조 (성진 담당):
  user_profiles/{uid}
    필드:
      nickname: str
      country: str
      language: str
      stability_score: float          ← +0.5 단위 지원
      stage: str                      ← AI_START / MISSION_PRACTICE / READY_TO_CONNECT / CONNECTING
      interests: list[str]
      communication_style: str | None
      created_at: timestamp
      streak_count: int               ← 연속 활동일 수 (Duolingo 스트릭)
      last_activity_date: str | None  ← "YYYY-MM-DD" 형식, 스트릭 계산용
      score_bar_visible: bool         ← 점수 바 표시 여부 (기본 False)
      ai_penalty_count: int           ← AI 대화 거친 언행 누적 횟수 (신뢰도 기준)
      user_penalty_count: int         ← 실제 대화 위반 누적 횟수
      user_warning_given: bool        ← 실제 대화 경고 1회 소진 여부

  user_profiles/{uid}/stability_logs/{id}
    필드: delta: float, reason: str, created_at: timestamp

  user_profiles/{uid}/missions/{id}
    필드: title, description, difficulty, verification_type, is_ai_generated,
          status, stability_delta, created_at, completed_at

  user_profiles/{uid}/mission_records/{id}
    필드: mission_id, verified, verification_type, text, image_url, created_at

최상위 위반 로그 컬렉션:
  blocked_ai_messages/{id}    ← AI 채팅 거친 언동
  blocked_chat_messages/{id}  ← 유저 간 채팅 위반

이벤트 참가 컬렉션 (fawwaz 담당):
  event_participations/{uid}__{event_id}
    └── feedback_messages/{id}        ← Do 피드백 채팅

건드리지 않는 컬렉션 (다른 팀원 담당):
  users/{uid}        ← fawwaz 로그인/프로필
  events/{id}        ← fawwaz 이벤트 파이프라인
  ai_chat_messages/  ← Han AI 채팅
  chat_rooms/        ← Han 유저간 채팅
  friendships/       ← Han 친구 관계 (unfriend 삭제 시에만 접근)
"""
from app.firebase import get_firestore

# ── 컬렉션 이름 상수 ──────────────────────────────────────────────────────────
COL_USER_PROFILES           = "user_profiles"
COL_STABILITY_LOGS          = "stability_logs"
COL_MISSIONS                = "missions"
COL_MISSION_RECORDS         = "mission_records"
COL_ONBOARDING_ANSWERS      = "onboarding_answers"
COL_BLOCKED_CHAT_MESSAGES   = "blocked_chat_messages"
COL_BLOCKED_AI_MESSAGES     = "blocked_ai_messages"
COL_FRIENDSHIPS             = "friendships"
COL_EVENT_PARTICIPATIONS    = "event_participations"
COL_EVENT_FEEDBACK_MESSAGES = "feedback_messages"


# ── User profiles ─────────────────────────────────────────────────────────────

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
    """유저 간 채팅 위반 메시지."""
    return get_firestore().collection(COL_BLOCKED_CHAT_MESSAGES)


def blocked_ai_messages_col():
    """AI 채팅 거친 언동 로그."""
    return get_firestore().collection(COL_BLOCKED_AI_MESSAGES)


# ── Han 담당 컬렉션 — unfriend 삭제 시에만 접근 ──────────────────────────────

def friendships_col():
    """Han이 관리하는 friendships 컬렉션. unfriend 시에만 사용."""
    return get_firestore().collection(COL_FRIENDSHIPS)


# ── Event participation (fawwaz 담당) ─────────────────────────────────────────

def _participation_id(uid: str, event_id: str) -> str:
    return f"{uid}__{event_id}"


def event_participations_col():
    return get_firestore().collection(COL_EVENT_PARTICIPATIONS)


def event_participation_doc(uid: str, event_id: str):
    return event_participations_col().document(_participation_id(uid, event_id))


def event_feedback_messages_col(uid: str, event_id: str):
    return event_participation_doc(uid, event_id).collection(COL_EVENT_FEEDBACK_MESSAGES)
