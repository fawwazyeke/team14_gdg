"""
ai_service.py — Firestore 유저 프로필 → ai_logic → Gemini 연결 서비스.

Firestore 필드 → ai_logic user_profile 매핑:
  interests           → interests          (유저가 앱에서 직접 선택)
  communication_style → conversation_style (DB 필드명 다름)
  social_style        → social_style       (AI 채팅 응답에서 점진적으로 학습)
  loneliness_level    → loneliness_level   (AI 채팅 응답에서 점진적으로 학습)
  task_preference     → task_preference    (AI 채팅 응답에서 점진적으로 학습)

대화 메모리 (SummaryBufferMemory):
  user_profiles/{uid}.ai_memory: { history: [...], summary: "..." }
  - 최근 6턴은 원문 유지, 10턴 초과 시 오래된 대화를 Gemini로 자동 요약·압축
  - 매 채팅 후 Firestore에 저장 → 앱 재시작/세션 종료 후에도 이어서 대화 가능
"""

from ai_logic.memory import SummaryBufferMemory
from ai_logic.prompts import CHATBOT_SYSTEM_PROMPT, build_chat_prompt
from app.database import user_doc
from app.services.gemini_service import generate_json


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


# ── 메모리 로드/저장 ──────────────────────────────────────────────────────────

def _load_memory(uid: str) -> SummaryBufferMemory:
    """Firestore user_profiles/{uid}.ai_memory → SummaryBufferMemory 복원."""
    snap = user_doc(uid).get()
    if not snap.exists:
        return SummaryBufferMemory()
    return SummaryBufferMemory.from_dict(snap.to_dict().get("ai_memory") or {})


def _save_memory(uid: str, mem: SummaryBufferMemory) -> None:
    """SummaryBufferMemory → Firestore user_profiles/{uid}.ai_memory 저장."""
    user_doc(uid).update({"ai_memory": mem.to_dict()})


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


def chat_with_ai(uid: str, user_message: str) -> dict:
    """
    유저 메시지 + Firestore 프로필 + 저장된 메모리 → Gemini → 개인화 응답.

    흐름:
      1. Firestore에서 유저 프로필 + SummaryBufferMemory 읽기
      2. 메모리 히스토리를 build_chat_prompt()에 주입
      3. Gemini 호출 → JSON 파싱
      4. mem.add_turn() → 10턴 초과 시 자동 요약·압축
      5. 업데이트된 메모리 Firestore에 저장
      6. profile_update_hint로 프로필 자동 업데이트 (점진적 학습)

    Gemini 미설정 또는 오류 시 fallback 응답 반환 (메모리는 저장하지 않음).

    반환 키:
      reply, detected_emotion, suggested_next_action, profile_update_hint
    """
    # 1. 프로필 + 메모리 로드 (Firestore 1회 읽기)
    snap = user_doc(uid).get()
    data = snap.to_dict() or {} if snap.exists else {}

    user_profile = {
        "interests":          data.get("interests") or [],
        "conversation_style": data.get("communication_style"),
        "social_style":       data.get("social_style"),
        "loneliness_level":   data.get("loneliness_level"),
        "task_preference":    data.get("task_preference") or [],
    }
    mem = SummaryBufferMemory.from_dict(data.get("ai_memory") or {})

    # 2. 프롬프트 생성 (요약 + 최근 히스토리 주입)
    prompt = build_chat_prompt(
        user_message=user_message,
        conversation_history=mem.get_history_for_prompt(),
        user_profile=user_profile,
    )

    # 3. Gemini 호출
    result = generate_json(prompt=prompt, system_instruction=CHATBOT_SYSTEM_PROMPT)

    if not result:
        return {**_FALLBACK_REPLY, "_fallback": True}

    reply = result.get("reply", "")

    # 4. 메모리에 턴 추가 (10턴 초과 시 자동 요약·압축)
    mem.add_turn(user_message, reply)

    # 5. 메모리 Firestore 저장
    try:
        _save_memory(uid, mem)
    except Exception:
        pass  # 저장 실패해도 응답은 반환

    # 6. profile_update_hint → Firestore 프로필 업데이트
    hint = result.get("profile_update_hint") or {}
    if hint:
        try:
            update_profile_from_hint(uid, hint)
        except Exception:
            pass

    return {
        "reply":                 reply,
        "detected_emotion":      result.get("detected_emotion", "unknown"),
        "suggested_next_action": result.get("suggested_next_action", "continue_conversation"),
        "profile_update_hint":   hint,
    }


def clear_memory(uid: str) -> None:
    """대화 메모리 초기화. 새 대화 시작 시 호출."""
    user_doc(uid).update({"ai_memory": {}})
