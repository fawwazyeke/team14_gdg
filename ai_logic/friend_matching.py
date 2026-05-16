"""
friend_matching.py
Deterministic, anonymous friend recommendation engine.

No Gemini calls. No FastAPI. No DB. Pure Python.
Real user IDs are NEVER returned — only anonymous_id is exposed.
"""

from __future__ import annotations

from typing import Optional


# ---------------------------------------------------------------------------
# Conversation style compatibility table
# ---------------------------------------------------------------------------

_CONV_STYLE_SCORES: dict[frozenset, float] = {
    frozenset({"calm", "deep"}): 0.8,
    frozenset({"casual", "humorous"}): 0.8,
    frozenset({"energetic", "humorous"}): 0.7,
    frozenset({"calm", "casual"}): 0.65,
    frozenset({"calm", "energetic"}): 0.5,
    frozenset({"deep", "humorous"}): 0.5,
    frozenset({"deep", "casual"}): 0.5,
    frozenset({"energetic", "casual"}): 0.6,
}

# ---------------------------------------------------------------------------
# Social style compatibility table
# ---------------------------------------------------------------------------

_SOCIAL_STYLE_SCORES: dict[frozenset, float] = {
    frozenset({"slow_to_open_up", "shy"}): 0.85,
    frozenset({"balanced", "outgoing"}): 0.75,
    frozenset({"balanced", "slow_to_open_up"}): 0.75,
    frozenset({"balanced", "shy"}): 0.70,
    frozenset({"outgoing", "slow_to_open_up"}): 0.55,
    frozenset({"outgoing", "shy"}): 0.50,
}

# ---------------------------------------------------------------------------
# Conversation starter templates keyed by interest
# ---------------------------------------------------------------------------

_STARTERS: dict[str, str] = {
    "music": "You could ask what song or artist they have been into lately.",
    "movies": "You could ask if there is a movie they have watched recently that they enjoyed.",
    "games": "You could ask what game they have been playing lately.",
    "reading": "You could ask if they are in the middle of any good book right now.",
    "walking": "You could ask if they have a favorite spot they like to walk or explore.",
    "food": "You could ask about a meal or snack they have been enjoying lately.",
    "cafe": "You could ask if they have found a good cafe or cozy spot recently.",
    "coding": "You could ask what kind of projects they enjoy building.",
    "animals": "You could ask if they have a pet or a favorite kind of animal.",
    "photography": "You could ask what kind of things they like to photograph.",
    "travel": "You could ask about a place they have been to or would like to visit.",
    "fitness": "You could ask what kind of exercise or activity they enjoy.",
    "animation": "You could ask what anime or animated series they have been watching.",
    "art": "You could ask about an artist or style of art they find interesting.",
    "writing": "You could ask if they enjoy writing and what they like to write about.",
    "study": "You could ask what subject or topic they enjoy learning about most.",
    "fashion": "You could ask if there is a style or brand they have been liking lately.",
    "conversation": "You could start by asking what kind of topics they enjoy talking about.",
    "sports": "You could ask if they follow a sport or team they are excited about.",
}

_DEFAULT_STARTER = "Try asking them something light about one of the things you both enjoy."


# ---------------------------------------------------------------------------
# Similarity functions
# ---------------------------------------------------------------------------

def jaccard_similarity(list_a: list[str], list_b: list[str]) -> float:
    """
    Compute Jaccard similarity between two lists of strings.

    Returns 0.0 if both lists are empty.
    """
    set_a = {s.strip().lower() for s in list_a if s}
    set_b = {s.strip().lower() for s in list_b if s}

    if not set_a and not set_b:
        return 0.0

    intersection = set_a & set_b
    union = set_a | set_b
    return round(len(intersection) / len(union), 4)


def conversation_style_score(
    style_a: Optional[str],
    style_b: Optional[str],
) -> float:
    """
    Return a compatibility score [0.0, 1.0] between two conversation styles.

    Rules:
      - same style → 1.0
      - known compatible pairs → see _CONV_STYLE_SCORES
      - unknown / missing → 0.4
      - otherwise → 0.5
    """
    a = (style_a or "").strip().lower()
    b = (style_b or "").strip().lower()

    if not a or not b or a == "unknown" or b == "unknown":
        return 0.4

    if a == b:
        return 1.0

    return _CONV_STYLE_SCORES.get(frozenset({a, b}), 0.5)


def social_style_score(
    style_a: Optional[str],
    style_b: Optional[str],
) -> float:
    """
    Return a compatibility score [0.0, 1.0] between two social styles.

    Rules:
      - same style → 1.0
      - known compatible pairs → see _SOCIAL_STYLE_SCORES
      - unknown / missing → 0.4
      - otherwise → 0.5
    """
    a = (style_a or "").strip().lower()
    b = (style_b or "").strip().lower()

    if not a or not b or a == "unknown" or b == "unknown":
        return 0.4

    if a == b:
        return 1.0

    return _SOCIAL_STYLE_SCORES.get(frozenset({a, b}), 0.5)


# ---------------------------------------------------------------------------
# Match score
# ---------------------------------------------------------------------------

def calculate_match_score(
    user_profile: dict,
    candidate_profile: dict,
) -> float:
    """
    Calculate overall match score between two user profiles.

    Formula:
      score = 0.60 * interest_similarity
            + 0.20 * conversation_style_score
            + 0.20 * social_style_score

    Returns a float in [0.0, 1.0].
    """
    interest_sim = jaccard_similarity(
        user_profile.get("interests") or [],
        candidate_profile.get("interests") or [],
    )

    conv_score = conversation_style_score(
        user_profile.get("conversation_style"),
        candidate_profile.get("conversation_style"),
    )

    soc_score = social_style_score(
        user_profile.get("social_style"),
        candidate_profile.get("social_style"),
    )

    total = 0.60 * interest_sim + 0.20 * conv_score + 0.20 * soc_score
    return round(min(total, 1.0), 4)


# ---------------------------------------------------------------------------
# Shared interests
# ---------------------------------------------------------------------------

def get_shared_interests(
    user_profile: dict,
    candidate_profile: dict,
) -> list[str]:
    """Return a sorted list of interests shared by both profiles."""
    set_a = {s.strip().lower() for s in (user_profile.get("interests") or []) if s}
    set_b = {s.strip().lower() for s in (candidate_profile.get("interests") or []) if s}
    return sorted(set_a & set_b)


# ---------------------------------------------------------------------------
# Rule-based match reason (no Gemini needed)
# ---------------------------------------------------------------------------

def generate_rule_based_match_reason(
    shared_interests: list[str],
    user_profile: dict,
    candidate_profile: dict,
) -> str:
    """
    Generate a warm English explanation for why these two users might connect.

    Based purely on shared interests and style compatibility.
    Never mentions real identities or private data.
    """
    conv_a = (user_profile.get("conversation_style") or "").lower()
    conv_b = (candidate_profile.get("conversation_style") or "").lower()
    soc_a = (user_profile.get("social_style") or "").lower()
    soc_b = (candidate_profile.get("social_style") or "").lower()

    # Interest part
    if len(shared_interests) >= 3:
        interest_str = ", ".join(shared_interests[:-1]) + f", and {shared_interests[-1]}"
        interest_part = f"You both seem to enjoy {interest_str}"
    elif len(shared_interests) == 2:
        interest_part = f"You both seem to enjoy {shared_interests[0]} and {shared_interests[1]}"
    elif len(shared_interests) == 1:
        interest_part = f"You both seem to enjoy {shared_interests[0]}"
    else:
        interest_part = "You may share some common interests"

    # Style part
    style_parts: list[str] = []
    if conv_a and conv_b and conv_a not in {"unknown", ""} and conv_b not in {"unknown", ""}:
        if conv_a == conv_b:
            style_parts.append(f"you both tend to have a {conv_a} conversation style")
        elif frozenset({conv_a, conv_b}) in _CONV_STYLE_SCORES:
            style_parts.append("your conversation styles may complement each other well")

    if soc_a and soc_b and soc_a not in {"unknown", ""} and soc_b not in {"unknown", ""}:
        if soc_a == soc_b and soc_a in {"shy", "slow_to_open_up"}:
            style_parts.append("you both seem to take your time warming up to new people")
        elif frozenset({soc_a, soc_b}) in _SOCIAL_STYLE_SCORES:
            style_parts.append("your social styles seem to be a comfortable fit")

    if style_parts:
        style_str = " and ".join(style_parts)
        return f"{interest_part}, and {style_str}."

    return f"{interest_part}, which could make starting a conversation feel natural."


# ---------------------------------------------------------------------------
# Conversation starter
# ---------------------------------------------------------------------------

def generate_conversation_starter(shared_interests: list[str]) -> str:
    """
    Return a safe, interest-based conversation opener.

    Picks the first shared interest that has a known template.
    Falls back to a generic opener if none match.
    """
    for interest in shared_interests:
        starter = _STARTERS.get(interest.lower())
        if starter:
            return starter
    return _DEFAULT_STARTER


# ---------------------------------------------------------------------------
# Main recommendation function
# ---------------------------------------------------------------------------

def recommend_friends(
    user_profile: dict,
    candidates: list[dict],
    limit: int = 5,
    min_score: float = 0.4,
) -> list[dict]:
    """
    Recommend anonymous friends sorted by match score.

    Args:
        user_profile: Dict with interests, conversation_style, social_style.
        candidates: List of candidate dicts. Each must have:
                    - "anonymous_id": str  (the only ID ever returned)
                    - "profile": dict with interests, conversation_style, social_style
                    (real "user_id" is silently ignored and never returned)
        limit: Maximum number of recommendations to return.
        min_score: Minimum match score (0–1) to include in results.

    Returns:
        List of recommendation dicts — each contains:
          anonymous_id, shared_interests, match_score, match_reason, conversation_starter
    """
    results: list[dict] = []

    for candidate in candidates:
        anonymous_id = candidate.get("anonymous_id")
        if not anonymous_id:
            # Skip candidates with no anonymous ID
            continue

        candidate_profile = candidate.get("profile") or {}
        shared = get_shared_interests(user_profile, candidate_profile)
        score = calculate_match_score(user_profile, candidate_profile)

        if score < min_score:
            continue

        reason = generate_rule_based_match_reason(shared, user_profile, candidate_profile)
        starter = generate_conversation_starter(shared)

        results.append(
            {
                "anonymous_id": anonymous_id,
                "shared_interests": shared,
                "match_score": score,
                "match_reason": reason,
                "conversation_starter": starter,
            }
        )

    results.sort(key=lambda r: r["match_score"], reverse=True)
    return results[:limit]
