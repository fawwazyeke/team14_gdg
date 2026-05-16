"""
moderation_service.py — 메시지 검열.

ai_logic/moderation.py의 2-layer 시스템(키워드 + Gemini 분류)을 래핑.
기존 공개 인터페이스(moderate_message / detect_toxicity_*) 유지.
"""

from ai_logic.moderation import moderate, get_warning, SCORE_DEDUCTION
from app.services.gemini_service import _get_client
from app.schemas import ModerationResult


# ── 기존 키워드 필터 (하위 호환 유지) ────────────────────────────────────────

_BAD_WORDS             = ["badword1", "badword2"]
_OFFLINE_MEETING_WORDS = ["meet offline", "come to my house", "phone number"]
_CRIME_WORDS           = ["weapon", "drug", "steal"]


def moderate_message(message: str) -> dict:
    """기존 키워드 필터 — 구조 변경 없이 유지."""
    lowered = message.lower()
    if any(w in lowered for w in _CRIME_WORDS):
        return {"allowed": False, "reason": "crime_related_content",
                "message": "This message was blocked for safety."}
    if any(w in lowered for w in _OFFLINE_MEETING_WORDS):
        return {"allowed": True, "reason": "offline_meeting_warning",
                "message": "Please avoid sharing private contact or offline meeting details."}
    if any(w in lowered for w in _BAD_WORDS):
        return {"allowed": True, "reason": "bad_language_warning",
                "message": "Please keep the conversation respectful."}
    return {"allowed": True, "reason": None, "message": None}


# ── 내부 공통 실행 ────────────────────────────────────────────────────────────

def _run_moderate(text: str, mode: str) -> dict:
    """
    ai_logic.moderation.moderate() 실행.
    client=None 이면 새 moderation.py가 Layer 1만 수행.

    반환:
      action, score_delta, reason, warning_msg, is_toxic, severity
    """
    result = moderate(text, mode=mode, client=_get_client())
    return {
        "action":      result.action,
        "score_delta": result.score_delta,
        "reason":      result.reason,
        "warning_msg": result.warning_msg,
        "is_toxic":    result.is_toxic,
        "severity":    result.severity,
    }


# ── 공개 인터페이스 ───────────────────────────────────────────────────────────

def detect_toxicity_ai_chat(text: str) -> ModerationResult:
    """AI 채팅 독성 감지."""
    r = _run_moderate(text, mode="ai")
    result = ModerationResult(is_toxic=r["is_toxic"], severity=r["severity"], reason=r["reason"])
    result.__dict__.update({"score_delta": r["score_delta"], "action": r["action"],
                            "warning_msg": r["warning_msg"]})
    return result


def detect_toxicity_user_chat(text: str) -> ModerationResult:
    """유저 간 채팅 독성 감지 (p2p 모드 — 더 엄격)."""
    r = _run_moderate(text, mode="p2p")
    result = ModerationResult(is_toxic=r["is_toxic"], severity=r["severity"], reason=r["reason"])
    result.__dict__.update({"score_delta": r["score_delta"], "action": r["action"],
                            "warning_msg": r["warning_msg"]})
    return result


def run_moderation(text: str, mode: str = "ai") -> dict:
    """
    stability.py 페널티 엔드포인트에서 직접 호출하는 통합 인터페이스.
    반환: { action, score_delta, reason, warning_msg, is_toxic, severity }
    """
    return _run_moderate(text, mode=mode)
