from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_uid
from app.services import friends_service

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
