"""
ai_service.py — Firestore 유저 프로필 → ai_logic → Gemini 연결 서비스.

Firestore 필드 → ai_logic user_profile 매핑:
  interests           → interests          (유저가 앱에서 직접 선택)
  communication_style → conversation_style (DB 필드명 다름)
  social_style        → social_style       (AI 채팅 응답에서 점진적으로 학습)
  loneliness_level    → loneliness_level   (AI 채팅 응답에서 점진적으로 학습)
  task_preference     → task_preference    (AI 채팅 응답에서 점진적으로 학습)
"""

import json
import os
import re
from typing import Optional

from dotenv import load_dotenv

from ai_logic.prompts import CHATBOT_SYSTEM_PROMPT, build_chat_prompt
from app.database import user_doc

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _get_client():
    """google.genai.Client 생성. API 키 없으면 None."""
    if not _GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=_GEMINI_API_KEY)
    except Exception:
        return None


# ── 프로필 변환 ───────────────────────────────────────────────────────────────

def get_ai_user_profile(uid: str) -> dict:
    """
    Firestore user_profiles/{uid} → ai_logic 호환 user_profile dict.
    없는 필드는 None 또는 빈 리스트로 채움.
    """
    snap = user_doc(uid).get()
    if not snap.exists:
        return {}
    data = snap.to_dict() or {}
    return {
        "interests":          data.get("interests") or [],
        "conversation_style": data.get("communication_style"),  # DB 필드명 매핑
        "social_style":       data.get("social_style"),         # 채팅 응답으로 점진적 학습
        "loneliness_level":   data.get("loneliness_level"),     # 채팅 응답으로 점진적 학습
        "task_preference":    data.get("task_preference") or [], # 채팅 응답으로 점진적 학습
    }


def update_profile_from_hint(uid: str, hint: dict) -> None:
    """
    AI 채팅 응답의 profile_update_hint로 Firestore 프로필 업데이트.

    - None / "unknown" / "null" 값은 무시 (기존 값 보존)
    - interests는 기존 값과 합집합으로 병합
    - conversation_style → communication_style 역매핑해서 저장
    """
    updates = {}

    social = hint.get("social_style")
    if social and social not in ("unknown", "null"):
        updates["social_style"] = social

    conv = hint.get("conversation_style")
    if conv and conv not in ("unknown", "null"):
        updates["communication_style"] = conv  # DB 필드명으로 역매핑

    loneliness = hint.get("loneliness_level")
    if loneliness and loneliness not in ("unknown", "null"):
        updates["loneliness_level"] = loneliness

    new_interests = [i for i in (hint.get("interests") or []) if i]
    if new_interests:
        snap = user_doc(uid).get()
        if snap.exists:
            existing = set(snap.to_dict().get("interests") or [])
            merged = sorted(existing | set(new_interests))
            if merged != sorted(existing):
                updates["interests"] = merged

    if updates:
        user_doc(uid).update(updates)


# ── AI 채팅 ───────────────────────────────────────────────────────────────────

_FALLBACK_REPLY = {
    "reply": "I'm here to listen. Tell me more about how you're feeling.",
    "detected_emotion": "unknown",
    "suggested_next_action": "continue_conversation",
    "profile_update_hint": {
        "interests": [],
        "social_style": None,
        "conversation_style": None,
        "loneliness_level": None,
    },
}


def chat_with_ai(
    uid: str,
    user_message: str,
    conversation_history: Optional[list] = None,
) -> dict:
    """
    유저 메시지 + Firestore 프로필 → Gemini → 개인화 응답.

    흐름:
      1. Firestore에서 유저 프로필 읽기
      2. build_chat_prompt()로 프로필 주입 프롬프트 생성
      3. Gemini 호출 → JSON 파싱
      4. profile_update_hint로 Firestore 프로필 자동 업데이트 (점진적 학습)
      5. 응답 반환

    Gemini 미설정(API 키 없음) 또는 오류 시 fallback 응답 반환.

    반환 키:
      reply, detected_emotion, suggested_next_action, profile_update_hint
      (오류 시 _fallback: True 추가)
    """
    user_profile = get_ai_user_profile(uid)
    prompt = build_chat_prompt(user_message, conversation_history, user_profile)

    # system prompt + user prompt 합쳐서 전달 (moderation.py 패턴 동일)
    full_prompt = CHATBOT_SYSTEM_PROMPT + "\n\n---\n\n" + prompt

    client = _get_client()
    if client is None:
        return {**_FALLBACK_REPLY, "_fallback": True, "_reason": "no_api_key"}

    try:
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=full_prompt,
        )
        text = response.text.strip()
        # 마크다운 코드 펜스 제거
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
        data = json.loads(text)
    except Exception as e:
        return {**_FALLBACK_REPLY, "_fallback": True, "_reason": str(e)}

    # profile_update_hint → Firestore 자동 업데이트
    hint = data.get("profile_update_hint") or {}
    if hint:
        try:
            update_profile_from_hint(uid, hint)
        except Exception:
            pass  # 프로필 업데이트 실패해도 채팅 응답 반환

    return {
        "reply":                data.get("reply", ""),
        "detected_emotion":     data.get("detected_emotion", "unknown"),
        "suggested_next_action":data.get("suggested_next_action", "continue_conversation"),
        "profile_update_hint":  hint,
    }
