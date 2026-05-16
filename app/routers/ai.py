"""
ai.py — AI 채팅 개인화 엔드포인트.

POST /ai/chat  — 유저 프로필 기반 Gemini 개인화 채팅 응답
"""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_uid
from app.services.ai_service import chat_with_ai

router = APIRouter()


class ChatTurn(BaseModel):
    role: str       # "user" | "assistant"
    content: str


class AIChatRequest(BaseModel):
    message: str
    conversation_history: Optional[list[ChatTurn]] = None  # 최대 10턴 권장


@router.post("/chat")
def ai_chat(body: AIChatRequest, uid: str = Depends(get_current_uid)):
    """
    유저 메시지 + Firestore 프로필 → Gemini → 개인화 AI 응답.

    흐름:
      1. Firestore에서 관심사/대화스타일/성향 읽기
      2. Gemini에 프로필 주입 → 개인화 응답 생성
      3. 응답에서 감지된 성향(social_style 등) → Firestore 자동 업데이트

    suggested_next_action:
      - continue_conversation : 대화 계속
      - recommend_task        : 미션 추천 화면으로 이동 (POST /missions/ai-recommend 호출)
      - suggest_friend_matching : 친구 매칭 화면으로 이동
      - safety_support        : 위기 상황 — 전문 지원 연결

    conversation_history: 최신 순이 아닌 오래된 순으로 전달.
    """
    history = [
        {"role": t.role, "content": t.content}
        for t in (body.conversation_history or [])
    ]
    return chat_with_ai(
        uid=uid,
        user_message=body.message,
        conversation_history=history,
    )
