from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.matching_service import (
    create_chat_room_for_match,
    get_chat_messages,
    get_recommended_users,
    reject_friendship,
    request_or_approve_friendship,
    save_chat_message,
)
from app.services.moderation_service import moderate_message

router = APIRouter()


class MatchingRequest(BaseModel):
    user_id: int
    user_profile: dict
    candidates: list[dict]


class FriendApproveRequest(BaseModel):
    user_id: int
    requester_anonymous_id: str
    target_anonymous_id: str


class FriendRejectRequest(BaseModel):
    user_id: int
    reason: Optional[str] = None


class ChatRoomCreateRequest(BaseModel):
    user_id: int
    user_anonymous_id: str
    target_anonymous_id: str


class ChatMessageCreateRequest(BaseModel):
    user_id: int
    message: str


@router.post("/recommendations")
def recommend_users(request: MatchingRequest):
    recommendations = get_recommended_users(
        user_profile=request.user_profile,
        candidates=request.candidates,
    )

    return {
        "user_id": request.user_id,
        "recommendations": recommendations,
    }


@router.post("/friends")
def approve_friend(request: FriendApproveRequest):
    return request_or_approve_friendship(
        requester_id=request.user_id,
        requester_anonymous_id=request.requester_anonymous_id,
        target_anonymous_id=request.target_anonymous_id,
    )


@router.patch("/friends/{friendship_id}/reject")
def reject_friend(friendship_id: str, request: FriendRejectRequest):
    return reject_friendship(
        friendship_id=friendship_id,
        user_id=request.user_id,
        reason=request.reason,
    )


@router.post("/rooms")
def create_chat_room(request: ChatRoomCreateRequest):
    return create_chat_room_for_match(
        user_id=request.user_id,
        user_anonymous_id=request.user_anonymous_id,
        target_anonymous_id=request.target_anonymous_id,
    )


@router.get("/rooms/{room_id}/messages")
def get_room_messages(room_id: str):
    return {
        "room_id": room_id,
        "messages": get_chat_messages(room_id),
    }


@router.post("/rooms/{room_id}/messages")
def send_chat_message(room_id: str, request: ChatMessageCreateRequest):
    moderation = moderate_message(request.message)

    save_result = save_chat_message(
        room_id=room_id,
        user_id=request.user_id,
        message=request.message,
        moderation=moderation,
    )

    if not moderation["allowed"]:
        return {
            "room_id": room_id,
            "saved": False,
            "blocked": True,
            "blocked_message_id": save_result.get("blocked_message_id"),
            "moderation": moderation,
        }

    return {
        "room_id": room_id,
        "saved": True,
        "blocked": False,
        "message_id": save_result.get("message_id"),
        "message": {
            "user_id": request.user_id,
            "content": request.message,
        },
        "moderation": moderation,
    }