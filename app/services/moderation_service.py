"""
moderation_service.py — 메시지 검열.

ai_logic/moderation.py의 2-layer 시스템(키워드 + Gemini 분류)을 래핑.
기존 공개 인터페이스(moderate_message / detect_toxicity_*) 유지.
"""

import os

from dotenv import load_dotenv

from ai_logic.moderation import moderate, get_warning, SCORE_DEDUCTION
from app.schemas import ModerationResult

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _get_client():
    """google.genai.Client 생성. API 키 없으면 None."""
    if not _GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=_GEMINI_API_KEY)
    except Exception:
        return None


# ── 기존 키워드 필터 (하위 호환 유지) ────────────────────────────────────────

_BAD_WORDS            = ["badword1", "badword2"]
_OFFLINE_MEETING_WORDS = ["meet offline", "come to my house", "phone number"]
_CRIME_WORDS          = ["weapon", "drug", "steal"]


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
    API 키 없으면 Layer 1(키워드) 스캔만 수행.

    반환:
      action      : "allow" | "warn" | "severe_warn" | "crisis" | "block"
      score_delta : int (0 또는 음수)  ← ai_logic.SCORE_DEDUCTION 기준
      reason      : str
      warning_msg : str (유저에게 보여줄 메시지)
      is_toxic    : bool
      severity    : int  0=clean, 1=warn, 2=severe_warn/block
    """
    client = _get_client()

    if client is None:
        # Layer 1 only
        from ai_logic.moderation import layer1_scan, _fallback_action
        from ai_logic.moderation import ModerationResult as AiMR
        l1 = layer1_scan(text)
        action = _fallback_action(l1.category) if l1.flagged else "allow"
        ai_result = AiMR(
            action=action,
            score_delta=-SCORE_DEDUCTION.get(action, 0),
            reason="Layer 2 skipped (no API key).",
            layer1=l1,
        )
    else:
        ai_result = moderate(text, client, _GEMINI_MODEL, mode=mode)

    severity = 0
    if ai_result.action == "warn":
        severity = 1
    elif ai_result.action in ("severe_warn", "block"):
        severity = 2

    return {
        "action":      ai_result.action,
        "score_delta": ai_result.score_delta,   # 음수 또는 0
        "reason":      ai_result.reason,
        "warning_msg": get_warning(ai_result.action, mode=mode),
        "is_toxic":    ai_result.action not in ("allow", "crisis"),
        "severity":    severity,
    }


# ── 공개 인터페이스 ───────────────────────────────────────────────────────────

def detect_toxicity_ai_chat(text: str) -> ModerationResult:
    """AI 채팅 독성 감지. result.score_delta / result.action / result.warning_msg 포함."""
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
