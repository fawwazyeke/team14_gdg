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
    UserProfileCreate,
    UserProfileResponse,
    UserStatusResponse,
    score_to_stage,
)

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
        "stability_score": 0,
        "stage": "AI_START",
        "interests": body.interests or [],
        "communication_style": body.communication_style,
        "created_at": datetime.utcnow(),
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
    score = data.get("stability_score", 0)
    stage = score_to_stage(score)

    return UserStatusResponse(
        uid=uid,
        stability_score=score,
        stage=stage,
        can_use_ai_chat=True,
        can_do_missions=score >= 36,
        can_recommend_users=score >= 61,
        can_access_events=score >= 61,
        can_chat_with_users=score >= 81,
    )
