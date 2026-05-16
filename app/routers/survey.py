"""온보딩 서베이 라우터.

user_profiles/{uid}/onboarding_answers 서브컬렉션에 저장.
완료 시 stability_score 업데이트.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.database import onboarding_col, user_doc
from app.dependencies import get_current_uid
from app.schemas import SurveyRequest, SurveyResponse, score_to_stage

router = APIRouter()


@router.post("", response_model=SurveyResponse)
def submit_survey(body: SurveyRequest, uid: str = Depends(get_current_uid)):
    """온보딩 답변 제출 → stability_score 합산 후 저장."""
    profile_ref = user_doc(uid)
    snap = profile_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found. Create profile first.")

    # 답변 저장
    col = onboarding_col(uid)
    total_score = 0
    for item in body.answers:
        col.add({
            "question_key": item.question_key,
            "answer": item.answer,
            "score": item.score,
            "created_at": datetime.utcnow(),
        })
        total_score += item.score

    # stability_score 업데이트
    current = snap.to_dict().get("stability_score", 0)
    new_score = current + total_score
    stage = score_to_stage(new_score)

    profile_ref.update({"stability_score": new_score, "stage": stage})

    return SurveyResponse(uid=uid, stability_score=new_score, stage=stage)
