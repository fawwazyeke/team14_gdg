"""
anonymous_name_service.py — 친구별 익명 이름 생성.

같은 (my_uid, friend_uid) 쌍은 항상 동일한 이름을 반환 (결정론적).
uid1→uid2, uid2→uid1은 서로 다른 이름이 나올 수 있음 (의도적 — 서로 모르게).

형식: "{형용사} {동물}"  예) "Gentle Panda", "Brave Owl"
"""

import hashlib

_ADJECTIVES = [
    "Gentle", "Brave", "Kind", "Calm", "Warm",
    "Bright", "Quiet", "Cozy", "Clever", "Soft",
    "Swift", "Bold", "Sweet", "Merry", "Lucky",
    "Sunny", "Witty", "Noble", "Vivid", "Cheery",
]

_ANIMALS = [
    "Panda", "Fox", "Owl", "Deer", "Bear",
    "Bunny", "Cat", "Wolf", "Otter", "Duck",
    "Hawk", "Seal", "Frog", "Lynx", "Dove",
    "Mole", "Lamb", "Crow", "Swan", "Cub",
]


def generate_anonymous_name(my_uid: str, friend_uid: str) -> str:
    """
    my_uid 관점에서 friend_uid를 부르는 익명 이름 생성.
    결정론적: 같은 입력이면 항상 같은 이름 반환.
    """
    raw = f"{my_uid}:{friend_uid}"
    digest = hashlib.sha256(raw.encode()).hexdigest()

    adj_idx = int(digest[:8], 16) % len(_ADJECTIVES)
    animal_idx = int(digest[8:16], 16) % len(_ANIMALS)

    return f"{_ADJECTIVES[adj_idx]} {_ANIMALS[animal_idx]}"
