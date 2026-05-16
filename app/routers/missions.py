"""미션 라우터.

user_profiles/{uid}/missions 서브컬렉션 관리.
미션 완료 시 stability_score 반영.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.database import mission_records_col, missions_col, stability_logs_col, user_doc
from app.dependencies import get_current_uid
from app.models import doc_to_mission, doc_to_record
from app.schemas import (
    MissionCompleteRequest,
    MissionCompleteResponse,
    MissionCreate,
    MissionResponse,
    RecordResponse,
    RecordWithMissionResponse,
    TodayMissionResponse,
    VALID_DIFFICULTIES,
    VALID_VERIFICATION_TYPES,
    score_to_stage,
)

router = APIRouter()


def _require_mission_unlocked(uid: str):
    snap = user_doc(uid).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found")
    score = snap.to_dict().get("stability_score", 0)
    if score < 36:
        raise HTTPException(
            status_code=403,
            detail=f"Missions are locked. Required score: 36, current: {score}",
        )
    return snap.to_dict()


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=MissionResponse, status_code=201)
def create_mission(body: MissionCreate, uid: str = Depends(get_current_uid)):
    _require_mission_unlocked(uid)

    if body.difficulty not in VALID_DIFFICULTIES:
        raise HTTPException(status_code=400, detail=f"difficulty must be one of {VALID_DIFFICULTIES}")
    if body.verification_type not in VALID_VERIFICATION_TYPES:
        raise HTTPException(status_code=400, detail=f"verification_type must be one of {VALID_VERIFICATION_TYPES}")

    data = {
        "title": body.title,
        "description": body.description,
        "difficulty": body.difficulty,
        "verification_type": body.verification_type,
        "status": "pending",
        "stability_delta": body.stability_delta,
        "created_at": datetime.utcnow(),
        "completed_at": None,
    }
    ref = missions_col(uid).add(data)
    doc_id = ref[1].id
    return doc_to_mission(doc_id, uid, data)


@router.get("", response_model=List[MissionResponse])
def list_missions(uid: str = Depends(get_current_uid)):
    _require_mission_unlocked(uid)
    docs = missions_col(uid).order_by("created_at").stream()
    return [doc_to_mission(d.id, uid, d.to_dict()) for d in docs]


@router.get("/today", response_model=TodayMissionResponse)
def get_today_mission(uid: str = Depends(get_current_uid)):
    _require_mission_unlocked(uid)
    docs = list(
        missions_col(uid)
        .where("status", "==", "pending")
        .order_by("created_at")
        .limit(1)
        .stream()
    )
    if not docs:
        return TodayMissionResponse(mission=None)

    d = docs[0]
    data = d.to_dict()
    return TodayMissionResponse(
        mission={
            "id": d.id,
            "title": data["title"],
            "description": data["description"],
            "difficulty": data["difficulty"],
            "verification_type": data["verification_type"],
            "status": data["status"],
            "stability_delta": data["stability_delta"],
        }
    )


@router.get("/{mission_id}", response_model=MissionResponse)
def get_mission(mission_id: str, uid: str = Depends(get_current_uid)):
    snap = missions_col(uid).document(mission_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Mission not found")
    return doc_to_mission(snap.id, uid, snap.to_dict())


@router.post("/{mission_id}/complete", response_model=MissionCompleteResponse)
def complete_mission(
    mission_id: str,
    body: MissionCompleteRequest,
    uid: str = Depends(get_current_uid),
):
    mission_ref = missions_col(uid).document(mission_id)
    mission_snap = mission_ref.get()
    if not mission_snap.exists:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission_data = mission_snap.to_dict()
    if mission_data["status"] == "completed":
        raise HTTPException(status_code=400, detail="Mission already completed")

    now = datetime.utcnow()

    # 미션 완료 처리
    mission_ref.update({"status": "completed", "completed_at": now})

    # 완료 기록 저장
    mission_records_col(uid).add({
        "mission_id": mission_id,
        "image_url": body.image_url,
        "text": body.text,
        "created_at": now,
    })

    # stability_score 업데이트
    delta = mission_data.get("stability_delta", 0)
    profile_ref = user_doc(uid)
    profile_data = profile_ref.get().to_dict()
    new_score = profile_data.get("stability_score", 0) + delta
    stage = score_to_stage(new_score)
    profile_ref.update({"stability_score": new_score, "stage": stage})

    # stability_log 기록
    stability_logs_col(uid).add({
        "delta": delta,
        "reason": f"mission_complete:{mission_id}",
        "created_at": now,
    })

    return MissionCompleteResponse(
        mission_id=mission_id,
        status="completed",
        stability_score=new_score,
        stage=stage,
        total_delta=delta,
    )


# ── Records ────────────────────────────────────────────────────────────────────

@router.get("/records/me", response_model=List[RecordWithMissionResponse])
def get_my_records(uid: str = Depends(get_current_uid)):
    records = mission_records_col(uid).order_by("created_at").stream()
    result = []
    for r in records:
        rdata = r.to_dict()
        mission_snap = missions_col(uid).document(rdata["mission_id"]).get()
        mission_title = mission_snap.to_dict().get("title", "") if mission_snap.exists else ""
        result.append({
            "id": r.id,
            "mission_id": rdata["mission_id"],
            "mission_title": mission_title,
            "image_url": rdata.get("image_url"),
            "text": rdata.get("text"),
            "created_at": rdata["created_at"],
        })
    return result
