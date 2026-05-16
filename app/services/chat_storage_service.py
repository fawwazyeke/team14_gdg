from datetime import datetime, timezone
from typing import Optional

from app.firebase import db


def load_user_memory(user_id: int) -> dict:
    """Firestore에서 유저의 대화 memory(history + summary)를 불러온다."""
    doc = db.collection("ai_chat_memory").document(str(user_id)).get()
    if doc.exists:
        return doc.to_dict()
    return {"history": [], "summary": ""}


def save_user_memory(user_id: int, history: list[dict], summary: str) -> None:
    """Firestore에 유저의 대화 memory를 저장한다."""
    db.collection("ai_chat_memory").document(str(user_id)).set(
        {"history": history, "summary": summary, "updated_at": datetime.now(timezone.utc)}
    )


def save_ai_chat_message(
    user_id: int,
    user_message: str,
    ai_response: dict,
    profile_update_hint: Optional[dict] = None,
) -> str:
    doc_ref = db.collection("ai_chat_messages").document()

    doc_ref.set(
        {
            "user_id": user_id,
            "user_message": user_message,
            "ai_response": ai_response,
            "profile_update_hint": profile_update_hint or {},
            "created_at": datetime.now(timezone.utc),
        }
    )

    return doc_ref.id