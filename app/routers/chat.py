from fastapi import APIRouter
from pydantic import BaseModel

from app.services.chatbot_service import create_ai_reply

router = APIRouter()


class ChatMessageRequest(BaseModel):
    user_id: int
    message: str
    conversation_history: list[dict] = []
    user_profile: dict = {}


@router.post("/ai")
def chat_with_ai(request: ChatMessageRequest):
    result = create_ai_reply(
        user_message=request.message,
        conversation_history=request.conversation_history,
        user_profile=request.user_profile,
    )

    return {
        "user_id": request.user_id,
        "ai_response": result,
    }