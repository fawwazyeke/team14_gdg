import hashlib
import random
from datetime import datetime, timezone
from typing import Optional

from app.database import user_doc, user_profiles_col
from app.firebase import get_firestore

ALIAS_NAMES = [
    "Quiet Shore", "Gentle Dawn", "Soft River", "Warm Hollow", "Still Meadow",
    "Calm Ember", "Bright Tide", "Tender Path", "Kind Summit", "Clear Willow",
    "Slow Harbor", "Open Field", "Bold Creek", "Steady Bridge", "Humble Stone",
    "Earnest Cloud", "Curious Bloom", "Patient Valley", "Wandering Lantern", "Honest Pebble",
    "Amber Dusk", "Silver Fog", "Golden Reed", "Fading Light", "Rising Mist",
    "Hollow Wind", "Soft Ember", "Pale Moon", "Gentle Creek", "Warm Dune",
    "Distant Shore", "Hidden Path", "Quiet Peak", "Slow Current", "Deep Willow",
    "Open Tide", "Lonely Birch", "Still Water", "Brave Finch", "Tender Root",
    "Small Fire", "Pale Bloom", "Kind Hollow", "Calm Ridge", "Bright Fern",
    "Wandering Brook", "Humble Flame", "Clear Pebble", "Steady Rain", "Earnest Fog",
    "Woven Light", "Bare Branch", "First Snow", "Muted Bell", "Lone Sparrow",
    "Soft Glow", "Salt Wind", "Cracked Clay", "Dark Moss", "Old Stone",
    "New Leaf", "Faint Echo", "Slow Drift", "Tall Reed", "Deep Shade",
    "Warm Dust", "Pale Creek", "Broken Tide", "Quiet Ash", "Gentle Slope",
    "Amber Reed", "Silver Path", "Hollow Rain", "Soft Dune", "Rising Fern",
    "Open Smoke", "Distant Bell", "Hidden Creek", "Pale Ridge", "Small Ember",
    "Kind Rain", "Brave Moss", "Tender Fog", "Clear Shore", "Steady Bloom",
    "Wandering Dust", "Humble Dawn", "Lone Birch", "Earnest Reed", "Woven Stone",
    "Bare Field", "First Light", "Muted Creek", "Salt Hollow", "Cracked Ridge",
    "Dark Willow", "Old Tide", "New Flame", "Faint Shore", "Slow Spark",
]


def generate_alias() -> str:
    return random.choice(ALIAS_NAMES)


def uid_alias(uid: str) -> str:
    """Deterministic alias for a UID — consistent across suggestion refreshes."""
    idx = int(hashlib.md5(uid.encode()).hexdigest(), 16) % len(ALIAS_NAMES)
    return ALIAS_NAMES[idx]


def _pair_key(uid_a: str, uid_b: str) -> str:
    return "__".join(sorted([uid_a, uid_b]))


def _now():
    return datetime.now(timezone.utc)


def _col():
    return get_firestore().collection("friendships")


def _get_profile(uid: str) -> Optional[dict]:
    snap = user_doc(uid).get()
    return snap.to_dict() if snap.exists else None


def send_friend_request(from_uid: str, to_uid: str) -> dict:
    from_profile = _get_profile(from_uid)
    to_profile = _get_profile(to_uid)

    if not from_profile:
        raise ValueError("Your profile was not found")
    if not to_profile:
        raise ValueError("That person's profile was not found")

    if (from_profile.get("age") or 0) < 18:
        raise PermissionError("You must be 18 or older to connect with people")
    if (to_profile.get("age") or 0) < 18:
        raise PermissionError("This person is not available to connect with")

    pair_key = _pair_key(from_uid, to_uid)
    doc_ref = _col().document(pair_key)
    existing = doc_ref.get()

    if existing.exists:
        data = existing.to_dict()
        status = data.get("status")
        if status == "accepted":
            raise ValueError("You are already connected")
        if status == "pending" and data.get("initiated_by") == from_uid:
            raise ValueError("Request already sent — waiting for their response")
        if status == "pending" and data.get("initiated_by") == to_uid:
            # Mutual interest — auto-accept
            doc_ref.update({"status": "accepted", "accepted_at": _now()})
            return {"status": "accepted", "pair_key": pair_key}

    uid_a, uid_b = sorted([from_uid, to_uid])
    doc_ref.set({
        "uid_a": uid_a,
        "uid_b": uid_b,
        "pair_key": pair_key,
        "initiated_by": from_uid,
        "status": "pending",
        "alias_for_a": generate_alias(),  # name uid_b uses to refer to uid_a
        "alias_for_b": generate_alias(),  # name uid_a uses to refer to uid_b
        "created_at": _now(),
        "accepted_at": None,
    })

    return {"status": "pending", "pair_key": pair_key}


def accept_friend_request(uid: str, from_uid: str) -> dict:
    pair_key = _pair_key(uid, from_uid)
    doc_ref = _col().document(pair_key)
    doc = doc_ref.get()

    if not doc.exists:
        raise ValueError("Friend request not found")

    data = doc.to_dict()
    if data.get("status") == "accepted":
        return {"status": "accepted", "pair_key": pair_key}
    if data.get("initiated_by") != from_uid:
        raise ValueError("No pending request from this user")

    doc_ref.update({"status": "accepted", "accepted_at": _now()})
    return {"status": "accepted", "pair_key": pair_key}


def reject_friend_request(uid: str, from_uid: str) -> dict:
    pair_key = _pair_key(uid, from_uid)
    doc_ref = _col().document(pair_key)
    if not doc_ref.get().exists:
        raise ValueError("Request not found")
    doc_ref.update({"status": "rejected", "rejected_at": _now()})
    return {"status": "rejected"}


def get_friends(uid: str) -> list[dict]:
    col = _col()
    friends = []

    for doc in col.where("uid_a", "==", uid).where("status", "==", "accepted").stream():
        d = doc.to_dict()
        friends.append({
            "pair_key": d["pair_key"],
            "other_uid": d["uid_b"],
            "alias": d.get("alias_for_b", "A fellow traveler"),
            "room_id": d["pair_key"],
        })

    for doc in col.where("uid_b", "==", uid).where("status", "==", "accepted").stream():
        d = doc.to_dict()
        friends.append({
            "pair_key": d["pair_key"],
            "other_uid": d["uid_a"],
            "alias": d.get("alias_for_a", "A fellow traveler"),
            "room_id": d["pair_key"],
        })

    return friends


def get_pending_requests(uid: str) -> list[dict]:
    col = _col()
    pending = []

    for doc in col.where("uid_a", "==", uid).where("status", "==", "pending").stream():
        d = doc.to_dict()
        if d.get("initiated_by") != uid:
            pending.append({
                "pair_key": d["pair_key"],
                "from_uid": d["initiated_by"],
                "alias": d.get("alias_for_a", "A fellow traveler"),
            })

    for doc in col.where("uid_b", "==", uid).where("status", "==", "pending").stream():
        d = doc.to_dict()
        if d.get("initiated_by") != uid:
            pending.append({
                "pair_key": d["pair_key"],
                "from_uid": d["initiated_by"],
                "alias": d.get("alias_for_b", "A fellow traveler"),
            })

    return pending


def get_suggested_friends(uid: str) -> list[dict]:
    my_profile = _get_profile(uid)
    if not my_profile:
        return []

    my_score = my_profile.get("stability_score") or 0
    my_interests = set(my_profile.get("interests") or [])
    my_age = my_profile.get("age") or 0

    if my_age < 18:
        return []

    col = _col()
    known: set[str] = set()
    for doc in col.where("uid_a", "==", uid).stream():
        known.add(doc.to_dict()["uid_b"])
    for doc in col.where("uid_b", "==", uid).stream():
        known.add(doc.to_dict()["uid_a"])

    candidates = []
    for doc in user_profiles_col().stream():
        other_uid = doc.id
        if other_uid == uid or other_uid in known:
            continue

        d = doc.to_dict()
        if (d.get("age") or 0) < 18:
            continue

        score_diff = abs((d.get("stability_score") or 0) - my_score)
        if score_diff > 20:
            continue

        shared = len(my_interests & set(d.get("interests") or []))
        candidates.append({
            "uid": other_uid,
            "alias": uid_alias(other_uid),
            "shared_interests": shared,
            "score_diff": score_diff,
            "stability_score": d.get("stability_score") or 0,
        })

    candidates.sort(key=lambda x: (-x["shared_interests"], x["score_diff"]))
    return candidates[:10]
