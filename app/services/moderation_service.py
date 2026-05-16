"""
moderation_service.py — 메시지 검열.

ai_logic/moderation.py의 2-layer 시스템(키워드 + Gemini 분류)을 래핑.
기존 공개 인터페이스(moderate_message) 유지.
"""

import os

from dotenv import load_dotenv

from ai_logic.moderation import moderate, get_warning, SCORE_DEDUCTION

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def _get_client():
    """google.genai.Client 생성. API 키 없으면 None."""
    if not _GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=_GEMINI_API_KEY)
    except Exception:
        return None


# ── 기존 키워드 필터 (하위 호환 유지) ─────────────────────────────────────────

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


# ── ai_logic.moderation 래퍼 ──────────────────────────────────────────────────

def run_moderation(text: str, mode: str = "ai") -> dict:
    """
    ai_logic.moderation.moderate() 실행 후 dict 반환.

    mode: "ai" (AI 채팅) | "p2p" (유저 간 채팅, 더 엄격)

    반환:
      action      : "allow" | "warn" | "severe_warn" | "crisis" | "block"
      score_delta : int (0 또는 음수)
      reason      : str
      warning_msg : str
      is_toxic    : bool
      severity    : int
    """
    client = _get_client()
    result = moderate(text, mode=mode, client=client)
    return {
        "action":      result.action,
        "score_delta": result.score_delta,
        "reason":      result.reason,
        "warning_msg": result.warning_msg,
        "is_toxic":    result.is_toxic,
        "severity":    result.severity,
    }