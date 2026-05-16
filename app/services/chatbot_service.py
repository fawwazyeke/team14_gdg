from ai_logic.prompts import CHATBOT_SYSTEM_PROMPT, build_chat_prompt
from ai_logic.fallbacks import get_chat_fallback, get_crisis_fallback
from app.services.gemini_service import generate_json

CRISIS_KEYWORDS = [
    "want to die",
    "kill myself",
    "hurt myself",
    "suicide",
    "end my life",
]


def has_crisis_signal(message: str) -> bool:
    lowered = message.lower()
    return any(keyword in lowered for keyword in CRISIS_KEYWORDS)


def create_ai_reply(
    user_message: str,
    conversation_history: list[dict],
    user_profile: dict,
) -> dict:
    if has_crisis_signal(user_message):
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

    if not result:
        return get_chat_fallback()

    return result