"""
schemas.py
Enum constants and JSON schema definitions for all AI response types.
Backend teammate can use these to validate Gemini output.
"""

# ---------------------------------------------------------------------------
# Enum constants
# ---------------------------------------------------------------------------

ALLOWED_EMOTIONS = [
    "neutral",
    "happy",
    "sad",
    "lonely",
    "anxious",
    "tired",
    "angry",
    "excited",
    "unknown",
]

ALLOWED_NEXT_ACTIONS = [
    "continue_conversation",
    "recommend_task",       # show the Mission screen
    "suggest_friend_matching",
    "safety_support",
]

ALLOWED_INTERESTS = [
    "music",
    "movies",
    "games",
    "sports",
    "fitness",
    "walking",
    "food",
    "cafe",
    "reading",
    "writing",
    "photography",
    "coding",
    "travel",
    "animals",
    "animation",
    "fashion",
    "study",
    "art",
    "conversation",
    "other",
]

ALLOWED_SOCIAL_STYLES = [
    "outgoing",
    "balanced",
    "slow_to_open_up",
    "shy",
    "unknown",
]

ALLOWED_CONVERSATION_STYLES = [
    "calm",
    "humorous",
    "deep",
    "casual",
    "energetic",
    "unknown",
]

ALLOWED_LONELINESS_LEVELS = [
    "low",
    "medium",
    "high",
    "unknown",
]

ALLOWED_TASK_PREFERENCES = [
    "easy",
    "medium",
    "challenging",
    "indoor",
    "outdoor",
    "social",
    "solo",
    "low_pressure",
    "creative",
    "active",
]

ALLOWED_TASK_CATEGORIES = [
    "self_reflection",
    "music",
    "walking",
    "wellness",
    "gratitude",
    "writing",
    "movies",
    "health",
    "food",
    "routine",
    "interest",
    "social",
    "fitness",
    "entertainment",
    "planning",
    "mindfulness",
    "friendship",
    "emotion",
    "profile",
    "self_compassion",
    "other",
]

ALLOWED_DIFFICULTIES = [
    "easy",
    "medium",
    "hard",
]

ALLOWED_PRESSURE_LEVELS = [
    "none",
    "gentle",
    "moderate",
]

ALLOWED_QUESTION_TYPES = [
    "mood_check",
    "social_comfort",
    "routine",
    "light_fun",
]
# Note: "interest_discovery" was removed — interests are now selected by the user
# directly in the app, not discovered through daily questions.

ALLOWED_CONFIDENCE_LEVELS = [
    "low",
    "medium",
    "high",
]

# ---------------------------------------------------------------------------
# JSON schema descriptions (dict format — backend can use for validation docs)
# ---------------------------------------------------------------------------

CHAT_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["reply", "detected_emotion", "suggested_next_action", "profile_update_hint"],
    "properties": {
        "reply": {
            "type": "string",
            "description": "AI reply in English (1–4 sentences). At most one follow-up question.",
        },
        "detected_emotion": {
            "type": "string",
            "enum": ALLOWED_EMOTIONS,
            "description": "Emotion detected from the user message.",
        },
        "suggested_next_action": {
            "type": "string",
            "enum": ALLOWED_NEXT_ACTIONS,
            "description": "Suggested next step the backend should take.",
        },
        "profile_update_hint": {
            "type": "object",
            "description": "Non-sensitive profile signals inferred from the message.",
            "properties": {
                "interests": {
                    "type": "array",
                    "items": {"type": "string", "enum": ALLOWED_INTERESTS},
                    "description": "Interests mentioned by the user.",
                },
                "social_style": {
                    "type": ["string", "null"],
                    "enum": ALLOWED_SOCIAL_STYLES + [None],
                    "description": "Social comfort style if inferable, else null.",
                },
                "conversation_style": {
                    "type": ["string", "null"],
                    "enum": ALLOWED_CONVERSATION_STYLES + [None],
                    "description": "Conversation tone/style if inferable, else null.",
                },
                "loneliness_level": {
                    "type": ["string", "null"],
                    "enum": ALLOWED_LONELINESS_LEVELS + [None],
                    "description": "Loneliness level if inferable, else null.",
                },
            },
        },
    },
}

DAILY_QUESTION_SCHEMA = {
    "type": "object",
    "required": ["question", "question_type", "reason"],
    "properties": {
        "question": {
            "type": "string",
            "description": "A short, natural Korean question for the user.",
        },
        "question_type": {
            "type": "string",
            "enum": ALLOWED_QUESTION_TYPES,
            "description": "Category of the question.",
        },
        "reason": {
            "type": "string",
            "description": "Brief internal reason why this question was chosen.",
        },
    },
}

TASK_GENERATION_SCHEMA = {
    "type": "object",
    "required": ["task", "reason", "safety_note"],
    "properties": {
        "task": {
            "type": "object",
            "required": ["title", "description", "category", "difficulty", "estimated_minutes", "tags"],
            "properties": {
                "title": {"type": "string", "description": "Short task title in Korean."},
                "description": {"type": "string", "description": "1–2 sentence task description in Korean."},
                "category": {
                    "type": "string",
                    "enum": ALLOWED_TASK_CATEGORIES,
                    "description": "Task category.",
                },
                "difficulty": {
                    "type": "string",
                    "enum": ALLOWED_DIFFICULTIES,
                    "description": "Task difficulty.",
                },
                "estimated_minutes": {
                    "type": "integer",
                    "description": "Estimated completion time in minutes. Usually ≤ 15.",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Short keyword tags.",
                },
            },
        },
        "reason": {
            "type": "string",
            "description": "Warm, brief Korean explanation for why the task was recommended.",
        },
        "safety_note": {
            "type": "string",
            "description": "Reassuring note that the user does not have to push themselves.",
        },
    },
}

PROFILE_ANALYSIS_SCHEMA = {
    "type": "object",
    "required": ["profile", "summary", "confidence"],
    "properties": {
        "profile": {
            "type": "object",
            "properties": {
                "interests": {
                    "type": "array",
                    "items": {"type": "string", "enum": ALLOWED_INTERESTS},
                },
                "social_style": {
                    "type": "string",
                    "enum": ALLOWED_SOCIAL_STYLES,
                },
                "conversation_style": {
                    "type": "string",
                    "enum": ALLOWED_CONVERSATION_STYLES,
                },
                "loneliness_level": {
                    "type": "string",
                    "enum": ALLOWED_LONELINESS_LEVELS,
                },
                "task_preference": {
                    "type": "array",
                    "items": {"type": "string", "enum": ALLOWED_TASK_PREFERENCES},
                },
            },
        },
        "summary": {
            "type": "string",
            "description": "Non-judgmental, short Korean summary of the user profile.",
        },
        "confidence": {
            "type": "string",
            "enum": ALLOWED_CONFIDENCE_LEVELS,
            "description": "Confidence level of the analysis.",
        },
    },
}

TASK_REASON_SCHEMA = {
    "type": "object",
    "required": ["reason"],
    "properties": {
        "reason": {
            "type": "string",
            "description": "1–2 sentence warm English explanation for the task recommendation.",
        },
    },
}

FRIEND_REASON_SCHEMA = {
    "type": "object",
    "required": ["match_reason", "conversation_starter"],
    "properties": {
        "match_reason": {
            "type": "string",
            "description": "Friendly English explanation for the match based on shared interests.",
        },
        "conversation_starter": {
            "type": "string",
            "description": "A safe, interest-based conversation opener in English.",
        },
    },
}

# Schema for the Mission screen — recommend_tasks() output
TASK_SCREEN_SCHEMA = {
    "type": "object",
    "required": ["tasks", "safety_note"],
    "description": (
        "Output of recommend_tasks(). Displayed on the Mission screen. "
        "The user sees all tasks and picks one."
    ),
    "properties": {
        "tasks": {
            "type": "array",
            "minItems": 1,
            "maxItems": 5,
            "description": "Ordered list of task options (best match first).",
            "items": {
                "type": "object",
                "required": ["task", "reason", "score"],
                "properties": {
                    "task": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "category": {"type": "string", "enum": ALLOWED_TASK_CATEGORIES},
                            "difficulty": {"type": "string", "enum": ALLOWED_DIFFICULTIES},
                            "estimated_minutes": {"type": "integer"},
                            "tags": {"type": "array", "items": {"type": "string"}},
                            "pressure_level": {"type": "string", "enum": ALLOWED_PRESSURE_LEVELS},
                        },
                    },
                    "reason": {
                        "type": "string",
                        "description": "Warm, personal English reason shown under each task card.",
                    },
                    "score": {
                        "type": "number",
                        "description": "Internal match score — not displayed to the user.",
                    },
                },
            },
        },
        "safety_note": {
            "type": "string",
            "description": "Reassuring note shown below all task cards.",
        },
    },
}

# Schema for Gemini-generated Mission screen tasks (used with build_task_generation_prompt)
GEMINI_TASK_SCREEN_SCHEMA = {
    "type": "object",
    "required": ["tasks", "safety_note"],
    "description": "Output of Gemini when called with build_task_generation_prompt().",
    "properties": {
        "tasks": {
            "type": "array",
            "description": "List of generated task options. Length matches the `count` parameter.",
            "items": {
                "type": "object",
                "required": [
                    "title", "description", "category", "difficulty",
                    "estimated_minutes", "tags", "pressure_level", "reason",
                ],
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "category": {"type": "string", "enum": ALLOWED_TASK_CATEGORIES},
                    "difficulty": {"type": "string", "enum": ALLOWED_DIFFICULTIES},
                    "estimated_minutes": {"type": "integer"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "pressure_level": {"type": "string", "enum": ALLOWED_PRESSURE_LEVELS},
                    "reason": {"type": "string"},
                },
            },
        },
        "safety_note": {"type": "string"},
    },
}
