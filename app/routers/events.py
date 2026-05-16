from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.event_feedback_service import (
    complete_event_feedback,
    get_joined_events,
    start_event_feedback,
    submit_event_feedback_answer,
)


router = APIRouter()


class EventRecommendationRequest(BaseModel):
    user_id: int
    interests: list[str]
    country: str
    city: str

class EventFeedbackStartRequest(BaseModel):
    user_id: int
    user_profile: Optional[dict] = None


class EventFeedbackAnswerRequest(BaseModel):
    user_id: int
    answer: str


class EventFeedbackCompleteRequest(BaseModel):
    user_id: int
    user_profile: Optional[dict] = None


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

@router.get("/joined")
def list_joined_events(user_id: int):
    return {
        "user_id": user_id,
        "events": get_joined_events(user_id),
    }


@router.post("/{event_id}/feedback/start")
def start_feedback(event_id: str, request: EventFeedbackStartRequest):
    return start_event_feedback(
        user_id=request.user_id,
        event_id=event_id,
        user_profile=request.user_profile,
    )


@router.post("/{event_id}/feedback/{session_id}/answer")
def submit_feedback_answer(
    event_id: str,
    session_id: str,
    request: EventFeedbackAnswerRequest,
):
    return submit_event_feedback_answer(
        user_id=request.user_id,
        event_id=event_id,
        session_id=session_id,
        answer=request.answer,
    )


@router.post("/{event_id}/feedback/{session_id}/complete")
def complete_feedback(
    event_id: str,
    session_id: str,
    request: EventFeedbackCompleteRequest,
):
    return complete_event_feedback(
        user_id=request.user_id,
        event_id=event_id,
        session_id=session_id,
        user_profile=request.user_profile,
    )