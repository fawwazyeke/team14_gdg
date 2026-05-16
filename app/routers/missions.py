"""미션 라우터.

user_profiles/{uid}/missions       ← 미션 목록
user_profiles/{uid}/mission_records ← 완료 + 인증 기록

미션 종류:
  기본 미션 (is_ai_generated=False): verification_type = "text" | "photo" 필수
  AI 미션  (is_ai_generated=True):  verification_type = None, 인증 불필요
"""
from datetime import datetime, timezone, date as date_type
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1.base_query import FieldFilter

from app.database import mission_records_col, missions_col, stability_logs_col, user_doc
from app.dependencies import get_current_uid
from app.models import doc_to_mission, doc_to_record
from app.services.mission_service import generate_ai_missions, generate_rule_based_missions
from app.schemas import (
    MissionCompleteRequest,
    MissionCompleteResponse,
    MissionCreate,
    MissionResponse,
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

    # 기본 미션은 verification_type 필수
    if not body.is_ai_generated:
        if not body.verification_type or body.verification_type not in VALID_VERIFICATION_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"기본 미션은 verification_type이 필요합니다: {VALID_VERIFICATION_TYPES}"
            )
    # AI 미션은 verification_type 무시 (강제 None)
    verification_type = None if body.is_ai_generated else body.verification_type

    data = {
        "title": body.title,
        "description": body.description,
        "difficulty": body.difficulty,
        "verification_type": verification_type,
        "is_ai_generated": body.is_ai_generated,
        "status": "pending",
        "stability_delta": body.stability_delta,
        "created_at": datetime.utcnow(),
        "completed_at": None,
    }
    ref = missions_col(uid).add(data)
    doc_id = ref[1].id
    return doc_to_mission(doc_id, uid, data)


def _today_str() -> str:
    return date_type.today().isoformat()   # "YYYY-MM-DD"


def _delete_old_missions(col) -> None:
    """Delete all missions whose date field is not today (midnight reset)."""
    today = _today_str()
    for doc in col.stream():
        d = doc.to_dict()
        if d.get("mission_date") != today:
            doc.reference.delete()


def _store_missions(col, mission_dicts: list) -> list:
    """Write generated missions to Firestore, return doc data list."""
    now = datetime.now(timezone.utc)
    today = _today_str()
    stored = []
    for m in mission_dicts:
        data = {
            "title": m.get("title", ""),
            "description": m.get("description", ""),
            "difficulty": m.get("difficulty", "easy"),
            "category": m.get("category", "wellness"),
            "verification_type": None,
            "is_ai_generated": True,
            "status": "pending",
            "stability_delta": float(m.get("stability_delta", 3)),
            "mission_date": today,
            "created_at": now,
            "completed_at": None,
        }
        ref = col.add(data)
        stored.append((ref[1].id, data))
    return stored


@router.get("", response_model=List[MissionResponse])
def list_missions(uid: str = Depends(get_current_uid)):
    """Return today's missions. Does NOT auto-generate — user must press the button."""
    _require_mission_unlocked(uid)
    col = missions_col(uid)
    today = _today_str()

    docs = [
        d for d in col.order_by("created_at").stream()
        if d.to_dict().get("mission_date") == today
    ]
    return [doc_to_mission(d.id, uid, d.to_dict()) for d in docs]


@router.post("/generate", response_model=List[MissionResponse])
def generate_todays_missions(uid: str = Depends(get_current_uid)):
    """
    Generate today's 3 AI missions using Gemini, personalised by score + interests.
    No-ops and returns existing missions if already generated today.
    Deletes previous days' missions first (midnight reset).
    """
    profile = _require_mission_unlocked(uid)
    col = missions_col(uid)
    today = _today_str()

    # Already generated today — return as-is
    todays = [d for d in col.order_by("created_at").stream()
              if d.to_dict().get("mission_date") == today]
    if todays:
        return [doc_to_mission(d.id, uid, d.to_dict()) for d in todays]

    # Delete stale missions from previous days
    _delete_old_missions(col)

    # Generate personalised missions
    mission_dicts = generate_ai_missions(user_profile=profile, count=3)

    stored = _store_missions(col, mission_dicts)
    return [doc_to_mission(doc_id, uid, data) for doc_id, data in stored]


@router.get("/today", response_model=TodayMissionResponse)
def get_today_mission(uid: str = Depends(get_current_uid)):
    _require_mission_unlocked(uid)
    docs = list(
        missions_col(uid)
        .where(filter=FieldFilter("status", "==", "pending"))
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
            "verification_type": data.get("verification_type"),
            "is_ai_generated": data.get("is_ai_generated", False),
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

    is_ai = mission_data.get("is_ai_generated", False)
    verification_type = mission_data.get("verification_type")

    # 기본 미션 인증 검증
    verified = False
    if not is_ai:
        if verification_type == "text":
            if not body.text or not body.text.strip():
                raise HTTPException(status_code=400, detail="텍스트 인증이 필요합니다.")
            verified = True
        elif verification_type == "photo":
            if not body.image_url or not body.image_url.strip():
                raise HTTPException(status_code=400, detail="사진 인증이 필요합니다.")
            verified = True
    # AI 미션은 인증 없이 완료
    else:
        verified = False

    now = datetime.utcnow()

    # 미션 완료 처리
    mission_ref.update({"status": "completed", "completed_at": now})

    # 완료 + 인증 기록 저장
    mission_records_col(uid).add({
        "mission_id": mission_id,
        "is_ai_generated": is_ai,
        "verified": verified,
        "verification_type": verification_type,
        "text": body.text if verification_type == "text" else None,
        "image_url": body.image_url if verification_type == "photo" else None,
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
        verified=verified,
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
