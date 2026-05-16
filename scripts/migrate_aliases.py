"""
Migrate all existing friendship aliases to the new Color + Musical Term scheme.

Usage:
    python3 scripts/migrate_aliases.py

What it does:
  Reads every document in the `friendships` collection, generates new
  deterministic aliases using uid_alias() (Color + Musical Term), and
  writes them back to Firestore.

Run from the project root (same dir as serviceAccountKey.json).
"""

import os
import sys
import hashlib

from dotenv import load_dotenv
load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore

KEY_FILE = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
if not os.path.exists(KEY_FILE):
    print("ERROR: serviceAccountKey.json not found.")
    sys.exit(1)

cred = credentials.Certificate(os.path.abspath(KEY_FILE))
firebase_admin.initialize_app(cred)
db = firestore.client()

# ── Same name pools as friends_service.py ────────────────────────────────────

_COLORS = [
    "Red", "Pink", "Orange", "Amber", "Yellow",
    "Lime", "Green", "Teal", "Cyan", "Blue",
    "Indigo", "Violet", "Purple", "Rose", "Coral",
    "Gold", "Sage", "Slate", "Crimson", "Cobalt",
]

_MUSICAL_TERMS = [
    "Harmony", "Melody", "Nocturne", "Prelude", "Sonata",
    "Ballad", "Chorus", "Serenade", "Echo", "Verse",
    "Chime", "Tempo", "Tune", "Reverie", "Overture",
    "Hymn", "Legato", "Rubato", "Crescendo", "Minuet",
    "Waltz", "Etude", "Interlude", "Rhapsody",
]

ALIAS_NAMES = [f"{c} {m}" for c in _COLORS for m in _MUSICAL_TERMS]


def uid_alias(uid: str) -> str:
    """Deterministic alias for a UID — same logic as friends_service.uid_alias()."""
    idx = int(hashlib.md5(uid.encode()).hexdigest(), 16) % len(ALIAS_NAMES)
    return ALIAS_NAMES[idx]


def main():
    col = db.collection("friendships")
    docs = list(col.stream())

    if not docs:
        print("No friendship documents found.")
        return

    print(f"Found {len(docs)} friendship document(s). Migrating aliases...\n")

    updated = 0
    for doc in docs:
        data = doc.to_dict() or {}
        uid_a = data.get("uid_a")
        uid_b = data.get("uid_b")

        if not uid_a or not uid_b:
            print(f"  SKIP {doc.id} — missing uid_a/uid_b")
            continue

        # alias_for_a = name uid_b uses to refer to uid_a
        # alias_for_b = name uid_a uses to refer to uid_b
        new_alias_a = uid_alias(uid_a)
        new_alias_b = uid_alias(uid_b)

        old_a = data.get("alias_for_a", "?")
        old_b = data.get("alias_for_b", "?")

        col.document(doc.id).update({
            "alias_for_a": new_alias_a,
            "alias_for_b": new_alias_b,
        })

        print(f"  {doc.id[:40]}")
        print(f"    alias_for_a: '{old_a}' → '{new_alias_a}'")
        print(f"    alias_for_b: '{old_b}' → '{new_alias_b}'")
        updated += 1

    print(f"\nDone. Updated {updated} document(s).")


if __name__ == "__main__":
    main()
