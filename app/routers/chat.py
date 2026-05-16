from fastapi import APIRouter
from pydantic import BaseModel

from app.services.chatbot_service import create_ai_reply
from app.services.chat_storage_service import save_ai_chat_message

router = APIRouter()


class ChatMessageRequest(BaseModel):
    user_id: int
    message: str
    user_profile: dict = {}


@router.post("/ai")
def chat_with_ai(request: ChatMessageRequest):
    result = create_ai_reply(
        user_id=request.user_id,
        user_message=request.message,
        user_profile=request.user_profile,
    )

    profile_update_hint = result.get("profile_update_hint", {})

    message_id = save_ai_chat_message(
        user_id=request.user_id,
        user_message=request.message,
        ai_response=result,
        profile_update_hint=profile_update_hint,
    )

    return {
        "user_id": request.user_id,
        "message_id": message_id,
        "ai_response": result,
    }
