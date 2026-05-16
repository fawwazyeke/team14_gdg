from datetime import datetime, timezone
from typing import Optional

from app.firebase import db


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