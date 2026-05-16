"""Auth 라우터.

Firebase Auth 토큰 검증만 담당.
실제 로그인/회원가입은 프론트엔드 Firebase SDK가 처리.
"""
from fastapi import APIRouter, Depends

from app.dependencies import get_current_uid

router = APIRouter()


@router.get("/me")
def verify_me(uid: str = Depends(get_current_uid)):
    """토큰이 유효한지 확인. uid 반환."""
    return {"uid": uid}
