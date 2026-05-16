"""챗봇 라우터.

대화 기록: user_profiles/{uid}/chat_history/{id}
AI 추론 유저 특성: user_profiles/{uid}/chat_profile/latest
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.database import chat_history_col, chat_profile_doc, user_doc
from app.dependencies import get_current_uid
from app.models import ts_to_dt
from app.schemas import (
    ChatHistoryItem,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatProfileResponse,
)

router = APIRouter()


@router.post("/ai", response_model=ChatMessageResponse)
def chat_with_ai(body: ChatMessageRequest, uid: str = Depends(get_current_uid)):
    """유저 메시지 전송 → AI 응답 + 대화 기록 저장 + 유저 특성 업데이트."""

    # 프로필 존재 확인
    if not user_doc(uid).get().exists:
        raise HTTPException(status_code=404, detail="Profile not found")

    # 최근 대화 기록 20개 불러오기 (AI 컨텍스트용)
    history_docs = list(
        chat_history_col(uid)
        .order_by("created_at")
        .limit_to_last(20)
        .stream()
    )
    conversation_history = [
        {"role": d.to_dict()["role"], "message": d.to_dict()["message"]}
        for d in history_docs
    ]

    # 유저 프로필 불러오기
    profile_data = user_doc(uid).get().to_dict()
    chat_profile_data = chat_profile_doc(uid).get()
    ai_profile = chat_profile_data.to_dict() if chat_profile_data.exists else {}

    merged_profile = {**profile_data, **ai_profile}

    # AI 응답 생성 (gemini 호출)
    try:
        from app.services.chatbot_service import build_ai_chat_prompt
        from app.services.gemini_service import call_gemini_json
        from ai_logic.prompts import CHATBOT_SYSTEM_PROMPT
        from ai_logic.schemas import CHAT_RESPONSE_SCHEMA

        prompt = build_ai_chat_prompt(
            user_message=body.message,
            conversation_history=conversation_history,
            user_profile=merged_profile,
        )
        ai_result = call_gemini_json(
            system_prompt=CHATBOT_SYSTEM_PROMPT,
            user_prompt=prompt,
            response_schema=CHAT_RESPONSE_SCHEMA,
        )
    except Exception:
        # Gemini 연동 전 fallback
        ai_result = {
            "reply": "I'm here to listen. Tell me more.",
            "detected_emotion": "neutral",
            "suggested_next_action": "continue_conversation",
            "profile_update_hint": {},
        }

    now = datetime.utcnow()

    # 유저 메시지 저장
    chat_history_col(uid).add({
        "role": "user",
        "message": body.message,
        "detected_emotion": None,
        "created_at": now,
    })

    # AI 응답 저장
    chat_history_col(uid).add({
        "role": "ai",
        "message": ai_result.get("reply", ""),
        "detected_emotion": ai_result.get("detected_emotion"),
        "created_at": now,
    })

    # chat_profile 업데이트 (AI가 추론한 유저 특성)
    hint = ai_result.get("profile_update_hint", {})
    if hint:
        update_data = {"updated_at": now}
        if hint.get("interests"):
            existing = set(ai_profile.get("interests", []))
            existing.update(hint["interests"])
            update_data["interests"] = list(existing)
        if hint.get("social_style"):
            update_data["social_style"] = hint["social_style"]
        if hint.get("conversation_style"):
            update_data["conversation_style"] = hint["conversation_style"]
        if hint.get("loneliness_level"):
            update_data["loneliness_level"] = hint["loneliness_level"]
        chat_profile_doc(uid).set(update_data, merge=True)

    return ChatMessageResponse(
        reply=ai_result.get("reply", ""),
        detected_emotion=ai_result.get("detected_emotion"),
        suggested_next_action=ai_result.get("suggested_next_action"),
    )


@router.get("/history", response_model=List[ChatHistoryItem])
def get_chat_history(uid: str = Depends(get_current_uid)):
    """대화 기록 전체 조회."""
    docs = chat_history_col(uid).order_by("created_at").stream()
    return [
        ChatHistoryItem(
            id=d.id,
            role=d.to_dict()["role"],
            message=d.to_dict()["message"],
            detected_emotion=d.to_dict().get("detected_emotion"),
            created_at=ts_to_dt(d.to_dict()["created_at"]),
        )
        for d in docs
    ]


@router.get("/profile", response_model=ChatProfileResponse)
def get_chat_profile(uid: str = Depends(get_current_uid)):
    """AI가 대화에서 추론한 유저 특성 조회."""
    snap = chat_profile_doc(uid).get()
    if not snap.exists:
        return ChatProfileResponse()

    data = snap.to_dict()
    return ChatProfileResponse(
        interests=data.get("interests", []),
        social_style=data.get("social_style"),
        conversation_style=data.get("conversation_style"),
        loneliness_level=data.get("loneliness_level"),
        task_preference=data.get("task_preference", []),
        updated_at=ts_to_dt(data.get("updated_at")) if data.get("updated_at") else None,
    )


@router.delete("/history")
def clear_chat_history(uid: str = Depends(get_current_uid)):
    """대화 기록 초기화."""
    docs = chat_history_col(uid).stream()
    for doc in docs:
        doc.reference.delete()
    return {"deleted": True}
