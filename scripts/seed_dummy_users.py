"""
Seed dummy user profiles for testing the friend suggestion feature.

Usage:
    python3 scripts/seed_dummy_users.py

What it does:
  1. Reads all real user_profiles to find the first real user and their score.
  2. If that score is < 36, bumps it to 41 so missions + friends both unlock.
  3. Creates 5 dummy profiles with scores within ±15 of the real user.
  4. Prints a summary so you know what was created.

Run from the project root (same dir as serviceAccountKey.json).
"""

import os
import sys
import random
from datetime import datetime, timezone

# ── load .env so FIREBASE_* vars are available if needed ──────────
from dotenv import load_dotenv
load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore

# ── init Firebase ─────────────────────────────────────────────────
KEY_FILE = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
if not os.path.exists(KEY_FILE):
    print("ERROR: serviceAccountKey.json not found. Run from project root.")
    sys.exit(1)

cred = credentials.Certificate(os.path.abspath(KEY_FILE))
firebase_admin.initialize_app(cred)
db = firestore.client()

# ── dummy data pools ─────────────────────────────────────────────
ALL_INTERESTS = ["sports", "music", "gaming", "art", "books", "nature", "food", "tech", "film", "fitness"]

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

def make_dummy_profiles():
    names = random.sample(ALIAS_NAMES, 5)
    offsets = [3, -5, 8, -10, 12]
    ages = [24, 22, 27, 21, 25]
    interest_sets = [
        ["music", "books", "film"],
        ["gaming", "tech", "music"],
        ["books", "nature", "art"],
        ["food", "fitness", "sports"],
        ["film", "art", "gaming"],
    ]
    return [
        {"nickname": names[i], "interests": interest_sets[i], "age": ages[i], "score_offset": offsets[i]}
        for i in range(5)
    ]

DUMMY_PROFILES = make_dummy_profiles()

DUMMY_UID_PREFIX = "dummy_test_uid_"

def now():
    return datetime.now(timezone.utc)

def main():
    col = db.collection("user_profiles")

    # ── find real users ───────────────────────────────────────────
    real_users = []
    for doc in col.stream():
        uid = doc.id
        if uid.startswith(DUMMY_UID_PREFIX):
            continue
        data = doc.to_dict()
        real_users.append((uid, data))

    if not real_users:
        print("No real user profiles found in user_profiles collection.")
        print("Sign in and complete onboarding first, then run this script.")
        sys.exit(1)

    # Use the first real user as the anchor
    real_uid, real_data = real_users[0]
    real_score = real_data.get("stability_score", 0)
    real_nickname = real_data.get("nickname", real_uid[:8])

    print(f"\nReal user found:")
    print(f"  UID:   {real_uid[:20]}...")
    print(f"  Name:  {real_nickname}")
    print(f"  Score: {real_score}")
    print(f"  Age:   {real_data.get('age', 'not set')}")

    # ── bump score and age if missing ────────────────────────────
    MIN_USEFUL_SCORE = 36
    updates = {}
    if real_score < MIN_USEFUL_SCORE:
        updates["stability_score"] = 41
        real_score = 41
        print(f"\n  Score was {real_score} — bumped to 41 so features unlock.")
    else:
        print(f"  Score is already {real_score} ✓")

    if not real_data.get("age") or real_data["age"] < 18:
        updates["age"] = 25
        print(f"  Age was not set — set to 25 so suggestions work.")

    if updates:
        col.document(real_uid).update(updates)

    # ── delete old dummy profiles ─────────────────────────────────
    deleted = 0
    for doc in col.stream():
        if doc.id.startswith(DUMMY_UID_PREFIX):
            col.document(doc.id).delete()
            deleted += 1
    if deleted:
        print(f"\nCleaned up {deleted} old dummy profile(s).")

    # ── create new dummy profiles ─────────────────────────────────
    print(f"\nCreating 5 dummy users around score {real_score}:\n")

    for i, tmpl in enumerate(DUMMY_PROFILES):
        uid = f"{DUMMY_UID_PREFIX}{i + 1:03d}"
        score = max(0, real_score + tmpl["score_offset"])
        data = {
            "nickname": tmpl["nickname"],
            "country": "unknown",
            "language": "unknown",
            "stability_score": score,
            "stage": "MISSION_PRACTICE",
            "interests": tmpl["interests"],
            "age": tmpl["age"],
            "communication_style": None,
            "created_at": now(),
            "_is_dummy": True,
        }
        col.document(uid).set(data)
        print(f"  {uid}  score={score}  age={tmpl['age']}  interests={tmpl['interests']}")

    print(f"""
Done! Open the app, go to the People tab, and you should see
suggestions. Pull down to refresh if the list is empty.

To clean up dummies later, run:
  python3 scripts/seed_dummy_users.py --clean
""")


def clean():
    col = db.collection("user_profiles")
    deleted = 0
    for doc in col.stream():
        if doc.id.startswith(DUMMY_UID_PREFIX):
            col.document(doc.id).delete()
            deleted += 1
    print(f"Deleted {deleted} dummy profile(s).")


if __name__ == "__main__":
    if "--clean" in sys.argv:
        clean()
    else:
        main()
