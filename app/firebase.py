"""Firebase Admin SDK 초기화 모듈.

serviceAccountKey.json 또는 GOOGLE_APPLICATION_CREDENTIALS 환경변수로 인증.
"""
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth

_app: firebase_admin.App | None = None


def _get_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app

    key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "serviceAccountKey.json")
    cred = credentials.Certificate(key_path)
    _app = firebase_admin.initialize_app(cred)
    return _app


def get_firestore() -> firestore.client:
    """Firestore 클라이언트 반환 (싱글톤)."""
    _get_app()
    return firestore.client()


def verify_token(id_token: str) -> dict:
    """Firebase Auth ID 토큰 검증 후 decoded token 반환."""
    _get_app()
    return auth.verify_id_token(id_token)
