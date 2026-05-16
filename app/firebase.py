"""Firebase Admin SDK initialization.

Frontend login uses the Firebase client SDK. The backend verifies those same
Firebase Auth ID tokens and reads/writes Firestore with Admin credentials.
"""
import json
import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore, auth

load_dotenv()

_app: firebase_admin.App | None = None


def _get_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    options = {"projectId": project_id} if project_id else None

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    service_account_file = (
        os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE")
        or os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
        or os.getenv("FIREBASE_CREDENTIALS_PATH")
        or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        or ("serviceAccountKey.json" if os.path.exists("serviceAccountKey.json") else None)
    )

    if service_account_json:
        cred = credentials.Certificate(json.loads(service_account_json))
    elif service_account_file:
        cred = credentials.Certificate(service_account_file)
    else:
        cred = credentials.ApplicationDefault()

    _app = firebase_admin.initialize_app(cred, options)
    return _app


def get_firestore() -> firestore.client:
    _get_app()
    return firestore.client()


def verify_token(id_token: str) -> dict:
    _get_app()
    return auth.verify_id_token(id_token)


class _LazyDb:
    """Proxy so `from app.firebase import db` works without eager initialization."""
    def __getattr__(self, name):
        return getattr(get_firestore(), name)


db = _LazyDb()
