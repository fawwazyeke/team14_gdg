# AI chat — Han 담당
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.chatbot_service import create_ai_reply
from app.services.chat_storage_service import save_ai_chat_message

router = APIRouter()
