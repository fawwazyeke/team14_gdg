from ai_logic.prompts import CHATBOT_SYSTEM_PROMPT, build_chat_prompt
from ai_logic.fallbacks import get_chat_fallback


def build_ai_chat_prompt(user_message: str, conversation_history: list, user_profile: dict) -> str:
    return build_chat_prompt(
        user_message=user_message,
        conversation_history=conversation_history,
        user_profile=user_profile,
    )