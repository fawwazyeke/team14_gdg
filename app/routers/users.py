"""유저 프로필 라우터.

user_profiles/{uid} 컬렉션 관리.
users/{uid} (fawwaz 로그인)은 건드리지 않음.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.database import user_doc
from app.dependencies import get_current_uid
from app.models import doc_to_user_profile
from app.schemas import (
    AI_PENALTY_TRUST_THRESHOLD,
    BadgeResponse,
    ScoreBarToggleResponse,
    TrustProfileResponse,
    UNLOCK_THRESHOLD,
    UserProfileCreate,
    UserProfileResponse,
    UserStatusResponse,
    badge_next_info,
    score_to_badge,
    score_to_stage,
)
from app.services.stability_service import get_streak, get_trust_profile

router = APIRouter()


@router.post("", response_model=UserProfileResponse, status_code=201)
def create_profile(body: UserProfileCreate, uid: str = Depends(get_current_uid)):
    """로그인 후 최초 1회 — 유저 프로필(국가, 언어 등) 생성."""
    ref = user_doc(uid)
    if ref.get().exists:
        raise HTTPException(status_code=400, detail="Profile already exists")

    data = {
        "nickname": body.nickname,
        "country": body.country,
        "language": body.language,
        "stability_score": 0.0,
        "stage": "AI_START",
        "interests": body.interests or [],
        "communication_style": body.communication_style,
        "age": body.age,
        "created_at": datetime.utcnow(),
        # 신규 필드 초기화
        "streak_count": 0,
        "last_activity_date": None,
        "score_bar_visible": False,
        "ai_penalty_count": 0,
        "user_penalty_count": 0,
        "user_warning_given": False,
    }
    ref.set(data)
    return doc_to_user_profile(uid, data)


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(uid: str = Depends(get_current_uid)):
    snap = user_doc(uid).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found")
    return doc_to_user_profile(uid, snap.to_dict())


@router.get("/me/status", response_model=UserStatusResponse)
def get_my_status(uid: str = Depends(get_current_uid)):
    snap = user_doc(uid).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found")

    data = snap.to_dict()
    score = float(data.get("stability_score", 0))
    stage = score_to_stage(score)

    return UserStatusResponse(
        uid=uid,
        stability_score=score,
        stage=stage,
        can_use_ai_chat=True,
        can_do_missions=score >= 36,
        can_recommend_users=score >= UNLOCK_THRESHOLD["user_chat"],      # 60
        can_access_events=score >= UNLOCK_THRESHOLD["user_chat"],            # 60
        can_chat_with_users=score >= UNLOCK_THRESHOLD["user_chat"],         # 60
        can_access_gatherings=score >= UNLOCK_THRESHOLD["gathering"],       # 100
    )


@router.patch("/me/settings/score-bar", response_model=ScoreBarToggleResponse)
def toggle_score_bar(uid: str = Depends(get_current_uid)):
    """점수 바 표시 ON/OFF 토글. 기본값 OFF (개인 페이지에서만 노출)."""
    ref = user_doc(uid)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found")

    current = snap.to_dict().get("score_bar_visible", False)
    new_value = not current
    ref.update({"score_bar_visible": new_value})
    return ScoreBarToggleResponse(uid=uid, score_bar_visible=new_value)


@router.get("/me/streak")
def get_my_streak(uid: str = Depends(get_current_uid)):
    """연속 활동(스트릭) 정보 조회."""
    return get_streak(uid)


@router.get("/me/trust", response_model=TrustProfileResponse)
def get_my_trust(uid: str = Depends(get_current_uid)):
    """신뢰도 프로파일 — AI 페널티 누적 횟수 기반."""
    return get_trust_profile(uid)


@router.get("/me/badge", response_model=BadgeResponse)
def get_my_badge(uid: str = Depends(get_current_uid)):
    """
    점수 기반 뱃지(음자리표) 조회.


    단계:
      0~99점    → 뱃지 없음
      100~499점 → 낮은음자리표
      500~999점 → 가온음자리표
      1000점+   → 높은음자리표


    next_badge / points_needed 로 UI 프로그레스바 표현 가능.
    """
    snap = user_doc(uid).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found")

    score = float(snap.to_dict().get("stability_score", 0))
    next_info = badge_next_info(score)

    return BadgeResponse(
        uid=uid,
        stability_score=score,
        badge=score_to_badge(score),
        **next_info,
    )
