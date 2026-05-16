from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_uid
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


# ── [AI 담당자 구현 예정] 모임/이벤트 AI 추천 ─────────────────────────────────

@router.get("/recommend")
async def recommend_events(uid: str = Depends(get_current_uid)):
    """
    [AI 담당자 구현 예정]
    사용자 프로필(관심사, 언어, 국가, stability_score)을 바탕으로
    AI가 적합한 gathering/event를 추천.

    현재: 빈 목록 반환 (테스트용 스텁).
    AI 담당자 구현 시 이 함수 내부를 교체하면 됨.
    반환 형식: { "recommendations": [ {...event fields...} ], "reason": str }
    """
    # TODO: AI 담당자 — user_profiles/{uid} 데이터 읽어서 ai_logic 또는 Gemini로 추천
    return {
        "recommendations": [],
        "reason": "AI 이벤트 추천 기능 구현 예정",
    }
