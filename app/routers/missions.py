"""미션 라우터.

user_profiles/{uid}/missions       ← 미션 목록
user_profiles/{uid}/mission_records ← 완료 + 인증 기록

미션 종류:
  기본 미션 (is_ai_generated=False): verification_type = "text" | "photo" 필수
  AI 미션  (is_ai_generated=True):  verification_type = None, 인증 불필요
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ai_logic.task_logic import recommend_tasks
from app.database import mission_records_col, missions_col, stability_logs_col, user_doc
from app.dependencies import get_current_uid
from app.models import doc_to_mission, doc_to_record
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
from app.services.ai_service import get_ai_user_profile

router = APIRouter()


class AIMissionRecommendRequest(BaseModel):
    current_mood: Optional[str] = None  # "tired" | "sad" | "lonely" | "happy" 등


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


# ── AI 미션 추천 ───────────────────────────────────────────────────────────────

@router.post("/ai-recommend", response_model=List[MissionResponse], status_code=201)
def ai_recommend_missions(
    body: AIMissionRecommendRequest = AIMissionRecommendRequest(),
    uid: str = Depends(get_current_uid),
):
    """
    유저 프로필 기반 AI 미션 3개 자동 생성 + Firestore 저장.

    흐름:
      1. Firestore에서 유저 프로필(관심사, 성향) 읽기
      2. 완료된 AI 미션의 source_task_id 수집 → 중복 추천 방지
      3. task_logic.recommend_tasks() 로 3개 추천 (순수 Python, Gemini 불필요)
      4. is_ai_generated=True 로 Firestore에 저장
      5. 저장된 미션 목록 반환

    이후 유저가 미션 선택 → 기존 POST /missions/{id}/complete 로 완료 처리.
    current_mood: AI 채팅에서 감지된 감정을 프론트에서 넘겨줄 수 있음.
    """
    _require_mission_unlocked(uid)

    user_profile = get_ai_user_profile(uid)

    # 완료된 AI 미션의 source_task_id 수집 (중복 추천 방지)
    completed_task_ids: list[str] = []
    existing_docs = missions_col(uid).where("is_ai_generated", "==", True).stream()
    for doc in existing_docs:
        data = doc.to_dict() or {}
        task_id = data.get("source_task_id")
        if task_id and data.get("status") == "completed":
            completed_task_ids.append(task_id)

    # task_logic으로 추천
    result = recommend_tasks(
        user_profile=user_profile,
        completed_task_ids=completed_task_ids,
        current_mood=body.current_mood,
        count=3,
    )

    # Firestore에 저장
    now = datetime.utcnow()
    saved_missions: list[dict] = []

    difficulty_map = {"easy": "easy", "medium": "normal", "hard": "hard"}

    for item in result["tasks"]:
        task = item["task"]
        diff = difficulty_map.get(task.get("difficulty", "easy"), "easy")
        data = {
            "title":            task.get("title", ""),
            "description":      task.get("description", ""),
            "difficulty":       diff,
            "verification_type": None,         # AI 미션 — 인증 불필요
            "is_ai_generated":  True,
            "source_task_id":   task.get("id"),  # 중복 방지용
            "ai_reason":        item.get("reason", ""),
            "status":           "pending",
            "stability_delta":  2,              # ai_mission_complete 기준
            "created_at":       now,
            "completed_at":     None,
        }
        ref = missions_col(uid).add(data)
        doc_id = ref[1].id
        saved_missions.append(doc_to_mission(doc_id, uid, data))

    return saved_missions


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
