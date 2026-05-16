"""
anonymous_name_service.py — 친구별 익명 이름 생성.

같은 (my_uid, friend_uid) 쌍은 항상 동일한 이름을 반환 (결정론적).
uid1→uid2, uid2→uid1은 서로 다른 이름이 나올 수 있음 (의도적 — 서로 모르게).

형식: "{Color} {MusicalTerm}"  예) "Amber Nocturne", "Indigo Waltz"
"""

import hashlib

_COLORS = [
    "Amber", "Crimson", "Indigo", "Violet", "Azure",
    "Scarlet", "Ivory", "Cobalt", "Jade", "Coral",
    "Slate", "Teal", "Ochre", "Sienna", "Sage",
    "Rose", "Gold", "Silver", "Onyx", "Pearl",
    "Lavender", "Cerulean", "Maroon", "Bronze", "Copper",
    "Sapphire", "Emerald", "Topaz", "Russet", "Dusk",
]

_MUSICAL_TERMS = [
    "Harmony", "Melody", "Nocturne", "Prelude", "Sonata",
    "Ballad", "Chorus", "Serenade", "Echo", "Verse",
    "Chime", "Tempo", "Tune", "Reverie", "Overture",
    "Hymn", "Legato", "Rubato", "Crescendo", "Minuet",
    "Waltz", "Etude", "Interlude", "Rhapsody",
]


def generate_anonymous_name(my_uid: str, friend_uid: str) -> str:
    """
    my_uid 관점에서 friend_uid를 부르는 익명 이름 생성.
    결정론적: 같은 입력이면 항상 같은 이름 반환.
    """
    raw = f"{my_uid}:{friend_uid}"
    digest = hashlib.sha256(raw.encode()).hexdigest()

    color_idx = int(digest[:8], 16) % len(_COLORS)
    term_idx = int(digest[8:16], 16) % len(_MUSICAL_TERMS)

    return f"{_COLORS[color_idx]} {_MUSICAL_TERMS[term_idx]}"
