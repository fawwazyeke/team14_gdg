"""
fallbacks.py
Pre-defined safe fallback responses for every AI output type.

Usage:
    from ai_logic.fallbacks import CHAT_FALLBACK_RESPONSE, CRISIS_FALLBACK_RESPONSE

Return the appropriate fallback when:
  - Gemini API call fails
  - Gemini returns invalid / unparseable JSON
  - A crisis / self-harm signal is detected before calling Gemini
  - The user shares sensitive personal information
  - Profile analysis has insufficient evidence
"""

import copy


# ---------------------------------------------------------------------------
# Chat fallback — Gemini failure or invalid JSON
# ---------------------------------------------------------------------------

CHAT_FALLBACK_RESPONSE: dict = {
    "reply": (
        "Something went wrong on my end just now. "
        "If you'd like, feel free to share what you were saying again — I'm here to listen."
    ),
    "detected_emotion": "unknown",
    "suggested_next_action": "continue_conversation",
    "profile_update_hint": {
        "interests": [],
        "social_style": None,
        "conversation_style": None,
        "loneliness_level": None,
    },
}

# ---------------------------------------------------------------------------
# Crisis fallback — self-harm / suicide / violence signals
# ---------------------------------------------------------------------------

CRISIS_FALLBACK_RESPONSE: dict = {
    "reply": (
        "Just saying that out loud takes a lot of courage, and I want you to know I'm here. "
        "If things feel too heavy to carry alone right now, please reach out to someone you trust, "
        "or contact emergency services (911) or a crisis helpline if you're in immediate danger. "
        "I'm still here and listening. Is this the hardest moment you've felt recently?"
    ),
    "detected_emotion": "sad",
    "suggested_next_action": "safety_support",
    "profile_update_hint": {
        "interests": [],
        "social_style": None,
        "conversation_style": None,
        "loneliness_level": "high",
    },
}

# ---------------------------------------------------------------------------
# Sensitive information fallback — user shares PII
# ---------------------------------------------------------------------------

SENSITIVE_INFO_FALLBACK_RESPONSE: dict = {
    "reply": (
        "You don't need to share personal details here — we keep things safe and anonymous. "
        "Instead, would you like to tell me about something you've been interested in or enjoying lately?"
    ),
    "detected_emotion": "neutral",
    "suggested_next_action": "ask_interest",
    "profile_update_hint": {
        "interests": [],
        "social_style": None,
        "conversation_style": None,
        "loneliness_level": None,
    },
}

# ---------------------------------------------------------------------------
# Profile analysis fallback — Gemini failure or weak evidence
# ---------------------------------------------------------------------------

PROFILE_ANALYSIS_FALLBACK: dict = {
    "profile": {
        "interests": [],
        "social_style": "unknown",
        "conversation_style": "unknown",
        "loneliness_level": "unknown",
        "task_preference": [],
    },
    "summary": "There isn't enough information yet to build a clear picture of this user's interests and style.",
    "confidence": "low",
}

# ---------------------------------------------------------------------------
# Task generation fallback — Gemini failure
# ---------------------------------------------------------------------------

TASK_GENERATION_FALLBACK: dict = {
    "task": {
        "title": "Write one sentence about your day",
        "description": "Describe how today felt in just one sentence — as short or as long as you like.",
        "category": "self_reflection",
        "difficulty": "easy",
        "estimated_minutes": 3,
        "tags": ["solo", "low_pressure"],
    },
    "reason": "This is a gentle activity you can do on your own with no pressure at all.",
    "safety_note": "There's no right or wrong answer — even a few words is perfectly fine.",
}

# ---------------------------------------------------------------------------
# Daily question fallback — Gemini failure
# ---------------------------------------------------------------------------

DAILY_QUESTION_FALLBACK: dict = {
    "question": "If you had to describe today in one word, what would it be?",
    "question_type": "mood_check",
    "reason": "Default mood-check question used as a fallback.",
}

# ---------------------------------------------------------------------------
# Friend recommendation reason fallback — Gemini failure
# ---------------------------------------------------------------------------

FRIEND_REASON_FALLBACK: dict = {
    "match_reason": "You two share some common interests, which could make starting a conversation feel natural.",
    "conversation_starter": "Try asking them something light about one of the things you both enjoy.",
}

# ---------------------------------------------------------------------------
# Task recommendation reason fallback — Gemini failure
# ---------------------------------------------------------------------------

TASK_REASON_FALLBACK: dict = {
    "reason": "This is a low-pressure activity you can start on your own whenever you feel ready.",
}


# ---------------------------------------------------------------------------
# Helper — always return a deep copy so callers cannot mutate the constants
# ---------------------------------------------------------------------------

def get_chat_fallback() -> dict:
    return copy.deepcopy(CHAT_FALLBACK_RESPONSE)


def get_crisis_fallback() -> dict:
    return copy.deepcopy(CRISIS_FALLBACK_RESPONSE)


def get_sensitive_info_fallback() -> dict:
    return copy.deepcopy(SENSITIVE_INFO_FALLBACK_RESPONSE)


def get_profile_analysis_fallback() -> dict:
    return copy.deepcopy(PROFILE_ANALYSIS_FALLBACK)


def get_task_generation_fallback() -> dict:
    return copy.deepcopy(TASK_GENERATION_FALLBACK)


def get_daily_question_fallback() -> dict:
    return copy.deepcopy(DAILY_QUESTION_FALLBACK)


def get_friend_reason_fallback() -> dict:
    return copy.deepcopy(FRIEND_REASON_FALLBACK)


def get_task_reason_fallback() -> dict:
    return copy.deepcopy(TASK_REASON_FALLBACK)
