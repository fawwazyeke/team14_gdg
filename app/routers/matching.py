"""
matching.py — 친구 매칭 추천 엔드포인트.

ai_logic/friend_matching.py의 순수 Python 매칭 엔진을 Firestore 데이터와 연결.

GET /matching/recommend  — 내 프로필 기반 익명 친구 추천
GET /matching/score      — 특정 유저와의 매칭 점수만 확인 (디버그용)

매칭 점수 공식:
  총점 = 관심사 Jaccard 유사도 × 0.60
       + 대화 스타일 호환도 × 0.20
       + 소셜 스타일 호환도 × 0.20

반환 시 실제 uid 는 절대 노출하지 않음.
anonymous_id = generate_anonymous_name(my_uid, candidate_uid) 로 생성 (결정론적).
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from ai_logic.friend_matching import recommend_friends, calculate_match_score
from app.database import user_doc, user_profiles_col
from app.dependencies import get_current_uid
from app.schemas import UNLOCK_THRESHOLD
from app.services.anonymous_name_service import generate_anonymous_name

router = APIRouter()


def _to_matching_profile(data: dict) -> dict:
    """
    Firestore user_profiles 도큐먼트 → ai_logic 매칭용 프로필 dict 변환.

    필드 매핑:
      communication_style (우리 DB) → conversation_style (ai_logic)
      social_style (우리 DB에 없음) → None (호환도 0.4 기본값 적용)
    """
    return {
        "interests": data.get("interests") or [],
        "conversation_style": data.get("communication_style"),  # DB 필드명 매핑
        "social_style": data.get("social_style"),               # 현재 미수집 → None
    }


# ── 추천 ─────────────────────────────────────────────────────────────────────

@router.get("/recommend")
def recommend_matches(
    limit: int = Query(default=5, ge=1, le=20, description="최대 추천 수"),
    min_score: float = Query(default=0.3, ge=0.0, le=1.0, description="최소 매칭 점수 (0~1)"),
    uid: str = Depends(get_current_uid),
):
    """
    내 프로필(관심사, 대화 스타일)을 기반으로 익명 친구를 추천.

    - 해금 조건: stability_score >= 60
    - 후보 풀: score >= 60 인 유저 (나 제외)
    - 반환: anonymous_id, match_score, match_reason, shared_interests, conversation_starter
    - 실제 uid 는 응답에 포함되지 않음
    """
    # 1. 내 프로필 조회
    my_snap = user_doc(uid).get()
    if not my_snap.exists:
        raise HTTPException(status_code=404, detail="Profile not found")

    my_data = my_snap.to_dict() or {}
    my_score = float(my_data.get("stability_score", 0))

    # 2. 해금 조건 확인
    if my_score < UNLOCK_THRESHOLD["user_chat"]:
        raise HTTPException(
            status_code=403,
            detail=(
                f"친구 매칭은 {UNLOCK_THRESHOLD['user_chat']}점 이상부터 가능합니다. "
                f"현재: {my_score:.1f}점"
            ),
        )

    my_profile = _to_matching_profile(my_data)

    # 3. 후보 목록 구성 (score >= 60, 나 제외)
    candidates = []
    docs = user_profiles_col().where("stability_score", ">=", float(UNLOCK_THRESHOLD["user_chat"])).stream()
    for doc in docs:
        if doc.id == uid:
            continue
        data = doc.to_dict() or {}
        anon_name = generate_anonymous_name(uid, doc.id)
        candidates.append({
            "anonymous_id": anon_name,
            "profile": _to_matching_profile(data),
        })

    # 4. 매칭 실행
    results = recommend_friends(my_profile, candidates, limit=limit, min_score=min_score)

    return {
        "my_score": my_score,
        "candidate_count": len(candidates),
        "count": len(results),
        "recommendations": results,
    }


# ── 점수 확인 (디버그) ────────────────────────────────────────────────────────

@router.get("/score/{target_uid}")
def get_match_score(
    target_uid: str,
    uid: str = Depends(get_current_uid),
):
    """
    나와 특정 유저의 매칭 점수만 반환 (디버그·개발 확인용).
    응답에 target_uid 는 포함되지 않음 — anonymous_name 만 반환.
    """
    my_snap = user_doc(uid).get()
    target_snap = user_doc(target_uid).get()

    if not my_snap.exists:
        raise HTTPException(status_code=404, detail="내 프로필을 찾을 수 없습니다.")
    if not target_snap.exists:
        raise HTTPException(status_code=404, detail="대상 유저 프로필을 찾을 수 없습니다.")

    my_profile = _to_matching_profile(my_snap.to_dict() or {})
    target_profile = _to_matching_profile(target_snap.to_dict() or {})

    score = calculate_match_score(my_profile, target_profile)
    anon_name = generate_anonymous_name(uid, target_uid)

    return {
        "anonymous_name": anon_name,
        "match_score": score,
        "my_interests": my_profile["interests"],
        "target_interests": target_profile["interests"],
    }
