"""
ai.py — AI 채팅 개인화 엔드포인트.

POST /ai/chat        — 유저 프로필 + 저장된 메모리 기반 Gemini 채팅
DELETE /ai/chat/memory — 대화 메모리 초기화 (새 대화 시작)
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_uid
from app.services.ai_service import chat_with_ai, clear_memory

router = APIRouter()


class AIChatRequest(BaseModel):
    message: str


@router.post("/chat")
def ai_chat(body: AIChatRequest, uid: str = Depends(get_current_uid)):
    """
    유저 메시지 → Gemini 개인화 응답. 대화 맥락은 Firestore에서 자동 관리.

    메모리 동작:
      - 최근 6턴은 원문 그대로 유지
      - 10턴 초과 시 오래된 대화를 Gemini가 자동 요약·압축
      - 매 응답 후 user_profiles/{uid}.ai_memory 에 저장
      - 앱 재시작 후에도 이전 대화 맥락 유지

    suggested_next_action:
      - continue_conversation    : 대화 계속
      - suggest_friend_matching  : 친구 매칭 화면 이동
      - safety_support           : 위기 상황 — 전문 지원 연결
    """
    return chat_with_ai(uid=uid, user_message=body.message)


@router.delete("/chat/memory", status_code=204)
def reset_memory(uid: str = Depends(get_current_uid)):
    """
    대화 메모리 초기화. 새 대화를 처음부터 시작할 때 호출.
    user_profiles/{uid}.ai_memory 를 빈 값으로 리셋.
    """
    clear_memory(uid)
