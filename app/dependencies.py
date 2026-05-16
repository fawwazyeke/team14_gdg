"""FastAPI 의존성 주입."""
import os

from fastapi import Depends, Header, HTTPException
from google.cloud.firestore import Client

from app.firebase import get_firestore, verify_token

_DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"


def get_db() -> Client:
    """Firestore 클라이언트를 라우터에 주입."""
    return get_firestore()


def get_current_uid(
    authorization: str = Header(None),
    x_dev_uid: str = Header(None),
) -> str:
    """
    Authorization: Bearer <firebase_id_token> 헤더에서 uid 추출.

    [로컬 개발 전용] DEV_MODE=true 일 때 X-Dev-UID 헤더로 uid 직접 지정 가능.
    예) X-Dev-UID: test-user-001
    프로덕션(DEV_MODE 미설정)에서는 X-Dev-UID 완전 무시.
    """
    if _DEV_MODE and x_dev_uid:
        return x_dev_uid

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = verify_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
