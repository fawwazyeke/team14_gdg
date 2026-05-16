"""
friends.py — 친구 관련 엔드포인트.

Han이 관리하는 friendships 컬렉션 구조:
  friendships/{friendship_id}: { user_ids: [uid1, uid2], created_at, ... }

GET    /friends/suggested                        — 친구 추천
POST   /friends/request/{target_uid}             — 친구 신청
GET    /friends/pending                          — 대기 중 요청
POST   /friends/accept/{from_uid}               — 수락
POST   /friends/reject/{from_uid}               — 거절
GET    /friends                                  — 친구 목록
DELETE /friends/{friend_uid}                     — 친구 취소
GET    /friends/me/anonymous-name/{friend_uid}   — 익명 이름 조회
"""

from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1.base_query import FieldFilter

from app.database import friendships_col
from app.dependencies import get_current_uid
from app.schemas import AnonymousNameResponse, FriendUnfriendResponse
from app.services import friends_service
from app.services.anonymous_name_service import generate_anonymous_name

router = APIRouter()


@router.get("/suggested")
def suggested_friends(uid: str = Depends(get_current_uid)):
    try:
        return friends_service.get_suggested_friends(uid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/request/{target_uid}", status_code=201)
def send_request(target_uid: str, uid: str = Depends(get_current_uid)):
    try:
        return friends_service.send_friend_request(uid, target_uid)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pending")
def pending_requests(uid: str = Depends(get_current_uid)):
    return friends_service.get_pending_requests(uid)


@router.post("/accept/{from_uid}")
def accept_request(from_uid: str, uid: str = Depends(get_current_uid)):
    try:
        return friends_service.accept_friend_request(uid, from_uid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reject/{from_uid}")
def reject_request(from_uid: str, uid: str = Depends(get_current_uid)):
    try:
        return friends_service.reject_friend_request(uid, from_uid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("")
def list_friends(uid: str = Depends(get_current_uid)):
    return friends_service.get_friends(uid)


@router.delete("/{friend_uid}", response_model=FriendUnfriendResponse)
def unfriend(friend_uid: str, uid: str = Depends(get_current_uid)):
    """
    친구 취소.
    pair_key 방식(uid_a__uid_b) 또는 user_ids 배열 방식 모두 지원.
    """
    from app.services.friends_service import _pair_key
    col = friendships_col()

    # pair_key 방식 먼저 시도
    pair_key = _pair_key(uid, friend_uid)
    doc_ref = col.document(pair_key)
    if doc_ref.get().exists:
        doc_ref.delete()
        return FriendUnfriendResponse(success=True, message="친구 관계가 삭제되었습니다.")

    # user_ids 배열 방식 폴백
    docs = col.where(filter=FieldFilter("user_ids", "array_contains", uid)).stream()
    for doc in docs:
        data = doc.to_dict() or {}
        if friend_uid in data.get("user_ids", []):
            col.document(doc.id).delete()
            return FriendUnfriendResponse(success=True, message="친구 관계가 삭제되었습니다.")

    raise HTTPException(status_code=404, detail="해당 친구 관계를 찾을 수 없습니다.")


@router.get("/me/anonymous-name/{friend_uid}", response_model=AnonymousNameResponse)
def get_anonymous_name(friend_uid: str, uid: str = Depends(get_current_uid)):
    """
    내가 특정 친구를 부르는 익명 이름 반환 (결정론적).
    """
    name = generate_anonymous_name(my_uid=uid, friend_uid=friend_uid)
    return AnonymousNameResponse(friend_uid=friend_uid, anonymous_name=name)
