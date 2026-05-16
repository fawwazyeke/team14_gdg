from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from app.services.event_service import (
    Event,
    EventQuery,
    EventRefreshResult,
    get_event,
    list_events,
    refresh_events,
)

router = APIRouter()


@router.get("", response_model=list[Event])
async def read_events(
    city: Literal["seoul", "tokyo"] | None = None,
    category: str | None = None,
    q: str | None = None,
    free_only: bool = False,
    min_social_score: int = Query(default=1, ge=1, le=5),
):
    return await list_events(
        EventQuery(
            city=city,
            category=category,
            q=q,
            free_only=free_only,
            min_social_score=min_social_score,
        )
    )


@router.get("/{event_id}", response_model=Event)
async def read_event(event_id: str):
    event = await get_event(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/refresh", response_model=EventRefreshResult)
async def refresh_event_cache(from_date: str | None = None, to_date: str | None = None):
    return await refresh_events(from_date=from_date, to_date=to_date)
