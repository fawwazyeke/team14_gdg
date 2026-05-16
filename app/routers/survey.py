"""온보딩 서베이 라우터.

개별 답변은 저장하지 않고 stability_score/stage만 업데이트.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.database import user_doc
from app.dependencies import get_current_uid
from app.schemas import SurveyRequest, SurveyResponse, score_to_stage

router = APIRouter()


@router.post("", response_model=SurveyResponse)
def submit_survey(body: SurveyRequest, uid: str = Depends(get_current_uid)):
    """온보딩 답변 제출 → 점수만 합산해 프로필에 저장."""
    profile_ref = user_doc(uid)
    snap = profile_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found. Create profile first.")

    total_score = sum(item.score for item in body.answers)
    current = snap.to_dict().get("stability_score", 0)
    new_score = current + total_score
    stage = score_to_stage(new_score)

    profile_ref.update({"stability_score": new_score, "stage": stage})

    return SurveyResponse(uid=uid, stability_score=new_score, stage=stage)
