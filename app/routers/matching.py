from fastapi import APIRouter
from pydantic import BaseModel

from app.services.matching_service import get_recommended_users
from app.services.moderation_service import moderate_message

router = APIRouter()


class MatchingRequest(BaseModel):
    user_id: int
    user_profile: dict
    candidates: list[dict]


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

class FriendAddRequest(BaseModel):
    user_id: int
    target_anonymous_id: str


class ChatRoomCreateRequest(BaseModel):
    user_id: int
    target_anonymous_id: str


class ChatMessageCreateRequest(BaseModel):
    user_id: int
    message: str


@router.post("/friends")
def add_friend(request: FriendAddRequest):
    return {
        "message": "Friend request created",
        "user_id": request.user_id,
        "target_anonymous_id": request.target_anonymous_id,
    }


@router.post("/rooms")
def create_chat_room(request: ChatRoomCreateRequest):
    return {
        "room_id": 1,
        "user_id": request.user_id,
        "target_anonymous_id": request.target_anonymous_id,
    }


@router.get("/rooms/{room_id}/messages")
def get_chat_messages(room_id: int):
    return {
        "room_id": room_id,
        "messages": [],
    }


@router.post("/rooms/{room_id}/messages")
def send_chat_message(room_id: int, request: ChatMessageCreateRequest):

    moderation = moderate_message(request.message)

    if not moderation["allowed"]:
        return {
            "room_id": room_id,
            "saved": False,
            "moderation": moderation,
        }

    return {
        "room_id": room_id,
        "saved": True,
        "message": {
            "user_id": request.user_id,
            "content": request.message,
        },
        "moderation": moderation,
    }