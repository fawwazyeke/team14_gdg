"""Firestore 도큐먼트 헬퍼.

SQLAlchemy 모델 대신 Firestore 도큐먼트를 dict로 다루고,
타입 변환(Timestamp → datetime)을 여기서 처리.
"""
from datetime import datetime
from typing import Any


def ts_to_dt(value: Any) -> datetime:
    """Firestore Timestamp → datetime 변환."""
    if value is None:
        return datetime.utcnow()
    if hasattr(value, "ToDatetime"):           # google.protobuf.Timestamp
        return value.ToDatetime()
    if hasattr(value, "_seconds"):             # firestore DatetimeWithNanoseconds
        return datetime.utcfromtimestamp(value._seconds)
    if isinstance(value, datetime):
        return value
    return datetime.utcnow()


def doc_to_user_profile(uid: str, data: dict) -> dict:
    return {
        "uid": uid,
        "nickname": data.get("nickname", ""),
        "country": data.get("country", ""),
        "language": data.get("language", ""),
        "stability_score": data.get("stability_score", 0),
        "stage": data.get("stage", "AI_START"),
        "interests": data.get("interests"),
        "communication_style": data.get("communication_style"),
        "created_at": ts_to_dt(data.get("created_at")),
    }


def doc_to_mission(doc_id: str, uid: str, data: dict) -> dict:
    return {
        "id": doc_id,
        "uid": uid,
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "difficulty": data.get("difficulty", "easy"),
        "category": data.get("category", "wellness"),
        "verification_type": data.get("verification_type"),   # None 허용 (AI 미션)
        "is_ai_generated": data.get("is_ai_generated", False),
        "status": data.get("status", "pending"),
        "stability_delta": data.get("stability_delta", 0),
        "created_at": ts_to_dt(data.get("created_at")),
        "completed_at": ts_to_dt(data.get("completed_at")) if data.get("completed_at") else None,
    }


def doc_to_record(doc_id: str, uid: str, data: dict) -> dict:
    return {
        "id": doc_id,
        "uid": uid,
        "mission_id": data.get("mission_id", ""),
        "image_url": data.get("image_url"),
        "text": data.get("text"),
        "created_at": ts_to_dt(data.get("created_at")),
    }
