"""FastAPI 의존성 주입."""
from fastapi import Depends, Header, HTTPException
from google.cloud.firestore import Client

from app.firebase import get_firestore, verify_token


def get_db() -> Client:
    """Firestore 클라이언트를 라우터에 주입."""
    return get_firestore()


def get_current_uid(authorization: str = Header(...)) -> str:
    """Authorization: Bearer <firebase_id_token> 헤더에서 uid 추출."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = verify_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
