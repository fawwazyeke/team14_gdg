from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class EventRecommendationRequest(BaseModel):
    user_id: int
    interests: list[str]
    country: str
    city: str


@router.post("/recommendations")
def recommend_events(request: EventRecommendationRequest):
    return {
        "user_id": request.user_id,
        "events": [],
    }


@router.post("/{event_id}/join-intent")
def join_event(event_id: int, user_id: int, will_join: bool):
    return {
        "event_id": event_id,
        "user_id": user_id,
        "will_join": will_join,
    }


@router.post("/group-chats/generate")
def generate_group_event_chats():
    return {
        "created_group_chats": [],
    }