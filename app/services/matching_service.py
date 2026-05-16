from datetime import datetime, timezone
from typing import Optional

from ai_logic.friend_matching import recommend_friends
from app.firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter


def get_recommended_users(user_profile: dict, candidates: list[dict]) -> list[dict]:
    return recommend_friends(
        user_profile=user_profile,
        candidates=candidates,
        limit=5,
        min_score=0.4,
    )


def _now():
    return datetime.now(timezone.utc)


def _build_pair_key(user_a: str, user_b: str) -> str:
    return "__".join(sorted([user_a, user_b]))


def request_or_approve_friendship(
    requester_id: int,
    requester_anonymous_id: str,
    target_anonymous_id: str,
) -> dict:
    pair_key = _build_pair_key(requester_anonymous_id, target_anonymous_id)
    doc_ref = db.collection("friendships").document(pair_key)
    doc = doc_ref.get()

    if not doc.exists:
        friendship = {
            "pair_key": pair_key,
            "participant_anonymous_ids": [
                requester_anonymous_id,
                target_anonymous_id,
            ],
            "approvals": {
                requester_anonymous_id: True,
                target_anonymous_id: False,
            },
            "status": "pending",
            "created_by_user_id": requester_id,
            "created_at": _now(),
            "updated_at": _now(),
            "accepted_at": None,
            "rejected_at": None,
        }

        doc_ref.set(friendship)

        return {
            "friendship_id": pair_key,
            "status": "pending",
            "message": "Friend approval saved. Waiting for the other user.",
        }

    friendship = doc.to_dict()
    approvals = friendship.get("approvals", {})
    approvals[requester_anonymous_id] = True

    participant_ids = friendship.get("participant_anonymous_ids", [])
    both_approved = all(approvals.get(anonymous_id) for anonymous_id in participant_ids)

    update_data = {
        "approvals": approvals,
        "updated_at": _now(),
    }

    if both_approved:
        update_data["status"] = "accepted"
        update_data["accepted_at"] = _now()
    elif friendship.get("status") != "rejected":
        update_data["status"] = "pending"

    doc_ref.update(update_data)

    return {
        "friendship_id": pair_key,
        "status": update_data.get("status", friendship.get("status", "pending")),
        "message": (
            "Friendship accepted."
            if both_approved
            else "Friend approval saved. Waiting for the other user."
        ),
    }


def reject_friendship(
    friendship_id: str,
    user_id: int,
    reason: Optional[str] = None,
) -> dict:
    doc_ref = db.collection("friendships").document(friendship_id)
    doc = doc_ref.get()

    if not doc.exists:
        return {
            "friendship_id": friendship_id,
            "status": "not_found",
            "message": "Friendship request was not found.",
        }

    doc_ref.update(
        {
            "status": "rejected",
            "rejected_by_user_id": user_id,
            "rejected_reason": reason,
            "rejected_at": _now(),
            "updated_at": _now(),
        }
    )

    return {
        "friendship_id": friendship_id,
        "status": "rejected",
        "message": "Friendship request rejected.",
    }


def create_chat_room_for_match(
    user_id: int,
    user_anonymous_id: str,
    target_anonymous_id: str,
) -> dict:
    pair_key = _build_pair_key(user_anonymous_id, target_anonymous_id)
    friendship_doc = db.collection("friendships").document(pair_key).get()

    if not friendship_doc.exists or friendship_doc.to_dict().get("status") != "accepted":
        return {
            "created": False,
            "reason": "friendship_not_accepted",
            "message": "Chat room can be created only after mutual approval.",
        }

    room_ref = db.collection("chat_rooms").document(pair_key)
    room_doc = room_ref.get()

    if room_doc.exists:
        return {
            "created": False,
            "room_id": pair_key,
            "message": "Chat room already exists.",
        }

    room = {
        "room_id": pair_key,
        "room_type": "anonymous_1_on_1",
        "participant_anonymous_ids": sorted([user_anonymous_id, target_anonymous_id]),
        "created_by_user_id": user_id,
        "created_at": _now(),
        "last_message": None,
        "last_message_at": None,
    }

    room_ref.set(room)

    return {
        "created": True,
        "room_id": pair_key,
        "message": "Chat room created.",
    }


def save_chat_message(
    room_id: str,
    user_id: int,
    message: str,
    moderation: dict,
) -> dict:
    if not moderation.get("allowed"):
        blocked_ref = db.collection("blocked_chat_messages").document()
        blocked_ref.set(
            {
                "room_id": room_id,
                "user_id": user_id,
                "content": message,
                "moderation": moderation,
                "created_at": _now(),
            }
        )

        return {
            "saved": False,
            "blocked": True,
            "blocked_message_id": blocked_ref.id,
        }

    message_ref = db.collection("chat_messages").document()
    message_ref.set(
        {
            "room_id": room_id,
            "user_id": user_id,
            "content": message,
            "moderation": moderation,
            "created_at": _now(),
        }
    )

    db.collection("chat_rooms").document(room_id).set(
        {
            "last_message": message,
            "last_message_at": _now(),
        },
        merge=True,
    )

    return {
        "saved": True,
        "blocked": False,
        "message_id": message_ref.id,
    }


def get_chat_messages(room_id: str) -> list[dict]:
    docs = (
        db.collection("chat_messages")
        .where(filter=FieldFilter("room_id", "==", room_id))
        .stream()
    )

    messages = []

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        messages.append(data)

    return sorted(messages, key=lambda item: item.get("created_at"))