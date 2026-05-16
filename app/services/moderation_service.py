"""
moderation_service.py — 메시지 검열.

[AI 담당자에게]
PLACEHOLDER 함수 2개를 실제 AI 감지 로직으로 교체하면 됨:
  _detect_toxicity_ai_chat_PLACEHOLDER   → AI 채팅 독성 감지
  _detect_toxicity_user_chat_PLACEHOLDER → 실제 유저 간 채팅 독성 감지

함수 교체 후 이름만 바꿔주면 나머지 코드는 자동 연동됨.
반환 형식은 아래 ModerationResult 구조를 유지할 것:
  { is_toxic: bool, severity: int(0~2), reason: Optional[str] }
"""

from app.schemas import ModerationResult

# ── 기존 키워드 기반 필터 (1차 방어선) ───────────────────────────────────────

_BAD_WORDS = ["badword1", "badword2"]
_OFFLINE_MEETING_WORDS = ["meet offline", "come to my house", "phone number"]
_CRIME_WORDS = ["weapon", "drug", "steal"]


def moderate_message(message: str) -> dict:
    """기존 키워드 필터 — 구조 변경 없이 유지."""
    lowered = message.lower()

    if any(word in lowered for word in _CRIME_WORDS):
        return {"allowed": False, "reason": "crime_related_content",
                "message": "This message was blocked for safety."}

    if any(word in lowered for word in _OFFLINE_MEETING_WORDS):
        return {"allowed": True, "reason": "offline_meeting_warning",
                "message": "Please avoid sharing private contact or offline meeting details."}

    if any(word in lowered for word in _BAD_WORDS):
        return {"allowed": True, "reason": "bad_language_warning",
                "message": "Please keep the conversation respectful."}

    return {"allowed": True, "reason": None, "message": None}


# ── [AI 담당자 구현 예정] 독성 감지 스텁 ────────────────────────────────────
#
# 아래 두 함수는 현재 항상 "clean" 반환 (테스트용 PLACEHOLDER).
# AI 담당자가 실제 모델/규칙으로 교체 후 함수명에서 _PLACEHOLDER 제거.
# stability_service.py에서 이 함수들을 import해서 사용중이므로
# 함수명 변경 시 아래 공개 래퍼(detect_toxicity_*)도 함께 업데이트.

def _detect_toxicity_ai_chat_PLACEHOLDER(text: str) -> ModerationResult:
    """
    [AI 담당자 구현 예정] AI 채팅에서 거친 언행/독성 감지.
    severity: 0=clean, 1=mild(경고 수준), 2=severe(페널티 차감 수준)
    현재: 항상 clean 반환 (테스트용).
    """
    return ModerationResult(is_toxic=False, severity=0, reason=None)


def _detect_toxicity_user_chat_PLACEHOLDER(text: str) -> ModerationResult:
    """
    [AI 담당자 구현 예정] 실제 유저 간 채팅에서 거친 언행/독성 감지.
    severity: 0=clean, 1=mild(경고), 2=severe(-40 페널티)
    현재: 항상 clean 반환 (테스트용).
    """
    return ModerationResult(is_toxic=False, severity=0, reason=None)


# ── 공개 인터페이스 (라우터에서 이걸 호출) ──────────────────────────────────

def detect_toxicity_ai_chat(text: str) -> ModerationResult:
    """AI 채팅 독성 감지. AI 담당자 구현 완료 시 내부 함수만 교체."""
    return _detect_toxicity_ai_chat_PLACEHOLDER(text)


def detect_toxicity_user_chat(text: str) -> ModerationResult:
    """유저 간 채팅 독성 감지. AI 담당자 구현 완료 시 내부 함수만 교체."""
    return _detect_toxicity_user_chat_PLACEHOLDER(text)
