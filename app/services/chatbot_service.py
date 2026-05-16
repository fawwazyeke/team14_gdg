"""
Chatbot service.
Han 브랜치와 함수명 통일: create_ai_reply()
"""


from ai_logic import (
    CHATBOT_SYSTEM_PROMPT,
    build_chat_prompt,
    get_chat_fallback,
    get_crisis_fallback,
)
from app.services.gemini_service import generate_json

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "hurt myself", "self-harm", "want to die",
]


def create_ai_reply(
    user_message: str,
    conversation_history: list,
    user_profile: dict,
) -> dict:
    """
    Han 브랜치와 동일한 인터페이스.
    crisis 감지 → prompt 빌드 → Gemini 호출 → fallback 처리.
    """
    if any(kw in user_message.lower() for kw in CRISIS_KEYWORDS):
        return get_crisis_fallback()

    prompt = build_chat_prompt(
        user_message=user_message,
        conversation_history=conversation_history[-10:],
        user_profile=user_profile,
    )

    result = generate_json(
        prompt=prompt,
        system_instruction=CHATBOT_SYSTEM_PROMPT,
    )

    return result if result else get_chat_fallback()
