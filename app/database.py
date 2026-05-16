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

건드리지 않는 컬렉션 (다른 팀원 담당):
  users/{uid}        ← fawwaz 로그인/프로필
  events/{id}        ← fawwaz 이벤트 파이프라인
  ai_chat_messages/  ← Han AI 채팅
  chat_rooms/        ← Han 유저간 채팅
  friendships/       ← Han 친구 관계 (unfriend 삭제 시에만 접근)
"""
from app.firebase import get_firestore

# 컬렉션 이름 상수
COL_USER_PROFILES = "user_profiles"
COL_STABILITY_LOGS = "stability_logs"
COL_MISSIONS = "missions"
COL_MISSION_RECORDS = "mission_records"


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


# ── Han 담당 컬렉션 — unfriend 삭제 시에만 접근 ──────────────────────────────
# friendships/{id}: { user_ids: [uid1, uid2], created_at, ... }
COL_FRIENDSHIPS = "friendships"


def friendships_col():
    """Han이 관리하는 friendships 컬렉션. unfriend 시에만 사용."""
    return get_firestore().collection(COL_FRIENDSHIPS)
