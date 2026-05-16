"""
friends.py — 친구 관련 엔드포인트 (성진 담당 부분).

Han이 관리하는 friendships 컬렉션 구조:
  friendships/{friendship_id}: { user_ids: [uid1, uid2], created_at, ... }

DELETE /friends/{friend_uid}            — 친구 취소 + Firestore 삭제
GET    /friends/me/anonymous-name/{friend_uid} — 익명 이름 조회
"""

from fastapi import APIRouter, Depends, HTTPException

from app.database import friendships_col
from app.dependencies import get_current_uid
from app.schemas import AnonymousNameResponse, FriendUnfriendResponse
from app.services.anonymous_name_service import generate_anonymous_name

router = APIRouter()


@router.delete("/{friend_uid}", response_model=FriendUnfriendResponse)
def unfriend(friend_uid: str, uid: str = Depends(get_current_uid)):
    """
    친구 취소.
    friendships 컬렉션에서 두 uid가 모두 포함된 도큐먼트를 찾아 삭제.
    """
    col = friendships_col()

    # uid 기준으로 검색 후 상대방 uid 확인
    docs = col.where("user_ids", "array_contains", uid).stream()
    target_doc_id = None
    for doc in docs:
        data = doc.to_dict() or {}
        if friend_uid in data.get("user_ids", []):
            target_doc_id = doc.id
            break

    if not target_doc_id:
        raise HTTPException(
            status_code=404,
            detail="해당 친구 관계를 찾을 수 없습니다.",
        )

    col.document(target_doc_id).delete()
    return FriendUnfriendResponse(success=True, message="친구 관계가 삭제되었습니다.")


@router.get("/me/anonymous-name/{friend_uid}", response_model=AnonymousNameResponse)
def get_anonymous_name(friend_uid: str, uid: str = Depends(get_current_uid)):
    """
    내가 특정 친구를 부르는 익명 이름 반환.
    같은 (나, 친구) 쌍은 항상 동일한 이름 반환 (결정론적).
    """
    name = generate_anonymous_name(my_uid=uid, friend_uid=friend_uid)
    return AnonymousNameResponse(friend_uid=friend_uid, anonymous_name=name)
