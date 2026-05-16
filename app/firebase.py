import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore

load_dotenv()

FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")


def initialize_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    if FIREBASE_CREDENTIALS_PATH:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
        return firebase_admin.initialize_app(
            cred,
            {"projectId": FIREBASE_PROJECT_ID} if FIREBASE_PROJECT_ID else None,
        )

    return firebase_admin.initialize_app()


initialize_firebase()
db = firestore.client()