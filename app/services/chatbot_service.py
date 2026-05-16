from ai_logic import (
    CHATBOT_SYSTEM_PROMPT,
    build_chat_prompt,
    get_chat_fallback,
    get_crisis_fallback,
)
from ai_logic.memory import SummaryBufferMemory
from app.services.gemini_service import generate_json
from app.services.chat_storage_service import load_user_memory, save_user_memory

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "hurt myself", "self-harm", "want to die",
]


def has_crisis_signal(message: str) -> bool:
    lowered = message.lower()
    return any(keyword in lowered for keyword in CRISIS_KEYWORDS)


def create_ai_reply(
    user_id: int,
    user_message: str,
    user_profile: dict,
) -> dict:
    if has_crisis_signal(user_message):
        return get_crisis_fallback()

    # Firestore에서 유저 memory 불러오기
    memory_data = load_user_memory(user_id)
    memory = SummaryBufferMemory.from_dict(memory_data)

    prompt = build_chat_prompt(
        user_message=user_message,
        conversation_history=memory.get_history_for_prompt(),
        user_profile=user_profile,
    )

    result = generate_json(
        prompt=prompt,
        system_instruction=CHATBOT_SYSTEM_PROMPT,
    )

    if not result:
        return get_chat_fallback()

    # memory 업데이트 후 Firestore에 저장
    reply = result.get("reply", "")
    memory.add_turn(user_message, reply)
    save_user_memory(user_id, memory.history, memory.summary)

    return result
