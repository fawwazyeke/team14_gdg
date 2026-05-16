"""
examples.py
Concrete input/output examples for every AI prompt builder.

These are reference examples for the backend teammate to understand
the expected behavior of each prompt. They are NOT live API calls.
"""

# ---------------------------------------------------------------------------
# 1. Chat — lonely user
# ---------------------------------------------------------------------------

CHAT_LONELY_USER = {
    "description": "User expresses loneliness",
    "function": "build_chat_prompt",
    "input": {
        "user_message": "I've been feeling really lonely lately.",
        "conversation_history": [],
        "user_profile": None,
    },
    "expected_output": {
        "reply": (
            "It sounds like things have felt pretty quiet and isolating lately — "
            "that's genuinely tough. "
            "Is there a part of the day that tends to feel the loneliest for you?"
        ),
        "detected_emotion": "lonely",
        "suggested_next_action": "continue_conversation",
        "profile_update_hint": {
            "interests": [],
            "social_style": None,
            "conversation_style": "calm",
            "loneliness_level": "medium",
        },
    },
}

# ---------------------------------------------------------------------------
# 2. Chat — user mentions music interest
# ---------------------------------------------------------------------------

CHAT_MUSIC_INTEREST = {
    "description": "User mentions they enjoy listening to music",
    "function": "build_chat_prompt",
    "input": {
        "user_message": "I really love listening to music.",
        "conversation_history": [],
        "user_profile": None,
    },
    "expected_output": {
        "reply": (
            "That's great — music can be such a good companion. "
            "Is there a particular genre or mood of music you find yourself going back to a lot?"
        ),
        "detected_emotion": "happy",
        "suggested_next_action": "ask_interest",
        "profile_update_hint": {
            "interests": ["music"],
            "social_style": None,
            "conversation_style": None,
            "loneliness_level": None,
        },
    },
}

# ---------------------------------------------------------------------------
# 3. Chat — shy user about social interactions
# ---------------------------------------------------------------------------

CHAT_SHY_USER = {
    "description": "User expresses discomfort talking to new people",
    "function": "build_chat_prompt",
    "input": {
        "user_message": "Talking to new people feels pretty overwhelming for me.",
        "conversation_history": [],
        "user_profile": None,
    },
    "expected_output": {
        "reply": (
            "That's completely understandable — a lot of people feel that way, "
            "and there's nothing wrong with warming up slowly. "
            "Do you find it easier when the other person makes the first move?"
        ),
        "detected_emotion": "anxious",
        "suggested_next_action": "continue_conversation",
        "profile_update_hint": {
            "interests": [],
            "social_style": "slow_to_open_up",
            "conversation_style": None,
            "loneliness_level": None,
        },
    },
}

# ---------------------------------------------------------------------------
# 4. Chat — crisis signal
# ---------------------------------------------------------------------------

CHAT_CRISIS = {
    "description": "User expresses suicidal ideation — must trigger safety_support",
    "function": "build_chat_prompt",
    "input": {
        "user_message": "I want to die.",
        "conversation_history": [],
        "user_profile": None,
    },
    "expected_output": {
        "reply": (
            "I'm really glad you said something, and I want you to know I'm here with you. "
            "If things feel unbearable right now, please reach out to someone you trust "
            "or call emergency services (911) or a crisis line. "
            "You don't have to face this alone."
        ),
        "detected_emotion": "sad",
        "suggested_next_action": "safety_support",
        "profile_update_hint": {
            "interests": [],
            "social_style": None,
            "conversation_style": None,
            "loneliness_level": "high",
        },
    },
}

# ---------------------------------------------------------------------------
# 5. Chat — user shares phone number (sensitive info)
# ---------------------------------------------------------------------------

CHAT_SENSITIVE_INFO = {
    "description": "User offers their phone number — must redirect without storing it",
    "function": "build_chat_prompt",
    "input": {
        "user_message": "Here's my phone number: 010-1234-5678",
        "conversation_history": [],
        "user_profile": None,
    },
    "expected_output": {
        "reply": (
            "You don't need to share personal details like that here — "
            "everything stays safe and anonymous. "
            "Is there something you've been enjoying lately that you'd like to talk about instead?"
        ),
        "detected_emotion": "neutral",
        "suggested_next_action": "ask_interest",
        "profile_update_hint": {
            "interests": [],
            "social_style": None,
            "conversation_style": None,
            "loneliness_level": None,
        },
    },
}

# ---------------------------------------------------------------------------
# 6. Daily question — no profile
# ---------------------------------------------------------------------------

DAILY_QUESTION_NO_PROFILE = {
    "description": "Daily question with no user profile data",
    "function": "build_daily_question_prompt",
    "input": {
        "user_profile": None,
        "recent_answers": None,
    },
    "expected_output": {
        "question": "If you had to describe today in one word, what would it be?",
        "question_type": "mood_check",
        "reason": "A simple, open mood-check question that works for any user regardless of profile.",
    },
}

# ---------------------------------------------------------------------------
# 7. Daily question — user with music interest
# ---------------------------------------------------------------------------

DAILY_QUESTION_MUSIC_INTEREST = {
    "description": "Daily question tailored to a user who likes music",
    "function": "build_daily_question_prompt",
    "input": {
        "user_profile": {
            "interests": ["music"],
            "social_style": "slow_to_open_up",
            "loneliness_level": "medium",
        },
        "recent_answers": ["Today felt kind of quiet."],
    },
    "expected_output": {
        "question": "Is there a song you've been listening to a lot this week?",
        "question_type": "interest_discovery",
        "reason": "The user enjoys music, so a music-based question feels natural and low-pressure.",
    },
}

# ---------------------------------------------------------------------------
# 8. Task generation — shy, lonely user
# ---------------------------------------------------------------------------

TASK_GENERATION_SHY_LONELY = {
    "description": "Task for a shy and lonely user — should be easy and solo",
    "function": "build_task_generation_prompt",
    "input": {
        "user_profile": {
            "interests": ["music", "movies"],
            "social_style": "shy",
            "loneliness_level": "high",
            "task_preference": ["solo", "low_pressure", "easy"],
        },
        "completed_tasks": [],
        "current_mood": "lonely",
    },
    "expected_output": {
        "task": {
            "title": "Make a short playlist for your current mood",
            "description": (
                "Put together 3-5 songs that match how you're feeling right now. "
                "There's no need to share it with anyone — it's just for you."
            ),
            "category": "music",
            "difficulty": "easy",
            "estimated_minutes": 10,
            "tags": ["solo", "music", "low_pressure", "self_compassion"],
        },
        "reason": (
            "Since you enjoy music and prefer activities without much pressure, "
            "making a personal playlist is a gentle and creative way to spend a little time with yourself."
        ),
        "safety_note": "There's no right or wrong playlist — whatever feels right is perfect.",
    },
}

# ---------------------------------------------------------------------------
# 9. Profile analysis — clear evidence
# ---------------------------------------------------------------------------

PROFILE_ANALYSIS_CLEAR = {
    "description": "Profile analysis with enough evidence for medium/high confidence",
    "function": "build_profile_analysis_prompt",
    "input": {
        "messages": [
            "I love watching movies, especially sci-fi.",
            "I'm not really a people person, I prefer staying home.",
            "I've been pretty lonely recently honestly.",
            "I like chill conversations, not too intense.",
        ],
        "current_profile": None,
    },
    "expected_output": {
        "profile": {
            "interests": ["movies"],
            "social_style": "slow_to_open_up",
            "conversation_style": "calm",
            "loneliness_level": "medium",
            "task_preference": ["solo", "indoor", "low_pressure"],
        },
        "summary": (
            "This user enjoys movies and prefers calm, low-key interactions. "
            "They seem to experience some loneliness and are more comfortable in quiet, solo settings."
        ),
        "confidence": "medium",
    },
}

# ---------------------------------------------------------------------------
# 10. Profile analysis — weak evidence
# ---------------------------------------------------------------------------

PROFILE_ANALYSIS_WEAK = {
    "description": "Profile analysis with very little evidence — should return low confidence",
    "function": "build_profile_analysis_prompt",
    "input": {
        "messages": ["ok", "yeah", "sure"],
        "current_profile": None,
    },
    "expected_output": {
        "profile": {
            "interests": [],
            "social_style": "unknown",
            "conversation_style": "unknown",
            "loneliness_level": "unknown",
            "task_preference": [],
        },
        "summary": "There isn't enough information yet to understand this user's interests or style.",
        "confidence": "low",
    },
}

# ---------------------------------------------------------------------------
# 11. Task recommendation reason
# ---------------------------------------------------------------------------

TASK_REASON_EXAMPLE = {
    "description": "Warm explanation for a music-based task recommended to a music lover",
    "function": "build_task_recommendation_reason_prompt",
    "input": {
        "user_profile": {
            "interests": ["music"],
            "social_style": "slow_to_open_up",
            "loneliness_level": "medium",
        },
        "selected_task": {
            "title": "Make a short playlist for your current mood",
            "category": "music",
            "difficulty": "easy",
        },
    },
    "expected_output": {
        "reason": (
            "Since you enjoy music, we thought creating a little personal playlist "
            "could be a nice, pressure-free way to spend some time with yourself today."
        ),
    },
}

# ---------------------------------------------------------------------------
# 12. Friend recommendation reason
# ---------------------------------------------------------------------------

FRIEND_REASON_EXAMPLE = {
    "description": "Anonymous friend match explanation based on shared music and movie interests",
    "function": "build_friend_recommendation_reason_prompt",
    "input": {
        "user_profile": {
            "interests": ["music", "movies"],
            "conversation_style": "calm",
            "social_style": "slow_to_open_up",
        },
        "candidate_profile": {
            "interests": ["music", "movies", "reading"],
            "conversation_style": "calm",
            "social_style": "balanced",
        },
        "shared_interests": ["music", "movies"],
        "match_score": 0.82,
    },
    "expected_output": {
        "match_reason": (
            "You both enjoy music and movies, and tend to prefer calm, relaxed conversations — "
            "so you might find it easy to chat without any pressure."
        ),
        "conversation_starter": (
            "You could ask them if there's a movie they've watched recently "
            "or a song they've been listening to a lot."
        ),
    },
}

# ---------------------------------------------------------------------------
# 13. task_logic — walking interest → outdoor walk task
# ---------------------------------------------------------------------------

TASK_LOGIC_WALKING = {
    "description": "User with walking interest and recent answer about walking → recommend walk task",
    "function": "recommend_task",
    "input": {
        "user_profile": {
            "interests": ["walking"],
            "social_style": "balanced",
            "loneliness_level": "low",
            "task_preference": ["easy", "outdoor", "active"],
        },
        "recent_answers": ["I love walking around my neighborhood in the evening."],
        "completed_task_ids": [],
        "current_mood": "neutral",
    },
    "expected_output": {
        "task": {
            "id": "task_001",
            "title": "Take a 10-minute walk",
            "category": "walking",
            "difficulty": "easy",
        },
        "score_range": [0.6, 1.0],
        "notes": "Score should be high due to walking interest overlap and answer keyword boost.",
    },
}

# ---------------------------------------------------------------------------
# 14. task_logic — music interest → playlist task
# ---------------------------------------------------------------------------

TASK_LOGIC_MUSIC = {
    "description": "User with music interest and recent answer about music → recommend playlist task",
    "function": "recommend_task",
    "input": {
        "user_profile": {
            "interests": ["music"],
            "social_style": "slow_to_open_up",
            "loneliness_level": "medium",
            "task_preference": ["easy", "solo", "low_pressure"],
        },
        "recent_answers": ["I've been listening to a lot of music lately — it really helps."],
        "completed_task_ids": [],
        "current_mood": "lonely",
    },
    "expected_output": {
        "task": {
            "category": "music",
            "difficulty": "easy",
        },
        "score_range": [0.7, 1.0],
        "notes": "Music interest + answer keyword + lonely mood should rank music tasks highest.",
    },
}

# ---------------------------------------------------------------------------
# 15. task_logic — tired/messy room answer → cleaning task
# ---------------------------------------------------------------------------

TASK_LOGIC_CLEANING = {
    "description": "User mentions feeling tired and messy room → recommend small cleaning task",
    "function": "recommend_task",
    "input": {
        "user_profile": {
            "interests": [],
            "social_style": "unknown",
            "loneliness_level": "medium",
            "task_preference": ["easy", "low_pressure"],
        },
        "recent_answers": ["My room is so messy and I feel totally unmotivated to do anything."],
        "completed_task_ids": [],
        "current_mood": "tired",
    },
    "expected_output": {
        "task": {
            "category": "cleaning",
            "difficulty": "easy",
            "pressure_level": "gentle",
        },
        "score_range": [0.3, 1.0],
        "notes": (
            "Cleaning keyword detected in recent answers + tired mood should boost easy "
            "cleaning tasks like 'Wash 3 dishes' or 'Put away 5 items'."
        ),
    },
}

# ---------------------------------------------------------------------------
# 16. task_logic — shy user → solo low-pressure task (NOT hard social task)
# ---------------------------------------------------------------------------

TASK_LOGIC_SHY_USER = {
    "description": "Shy user should get a solo, low-pressure task — not a difficult social task",
    "function": "recommend_task",
    "input": {
        "user_profile": {
            "interests": [],
            "social_style": "shy",
            "loneliness_level": "high",
            "task_preference": ["solo", "low_pressure", "easy"],
        },
        "recent_answers": [],
        "completed_task_ids": [],
        "current_mood": "anxious",
    },
    "expected_output": {
        "task": {
            "difficulty": "easy",
            "pressure_level_not": "moderate",
        },
        "notes": (
            "The recommended task must be easy and solo. "
            "Hard social tasks should be penalized and not selected."
        ),
    },
}

# ---------------------------------------------------------------------------
# 17. task_logic — outgoing user → light social task allowed
# ---------------------------------------------------------------------------

TASK_LOGIC_OUTGOING_USER = {
    "description": "Outgoing user can receive a light social task",
    "function": "recommend_task",
    "input": {
        "user_profile": {
            "interests": [],
            "social_style": "outgoing",
            "loneliness_level": "low",
            "task_preference": ["social", "easy"],
        },
        "recent_answers": ["I like meeting people and chatting."],
        "completed_task_ids": [],
        "current_mood": "happy",
    },
    "expected_output": {
        "notes": (
            "Social tasks should NOT be penalized for outgoing users. "
            "A task like 'Send a short message' is acceptable."
        ),
    },
}

# ---------------------------------------------------------------------------
# 18. friend_matching — high-score match with shared music + movies
# ---------------------------------------------------------------------------

FRIEND_MATCH_HIGH_SCORE = {
    "description": "High-score friend match based on shared music and movies interest",
    "function": "recommend_friends",
    "input": {
        "user_profile": {
            "interests": ["music", "movies"],
            "conversation_style": "calm",
            "social_style": "slow_to_open_up",
        },
        "candidates": [
            {
                "user_id": "user456",
                "anonymous_id": "anon_4821",
                "profile": {
                    "interests": ["music", "movies", "cafe"],
                    "conversation_style": "calm",
                    "social_style": "slow_to_open_up",
                },
            }
        ],
        "min_score": 0.4,
    },
    "expected_output": [
        {
            "anonymous_id": "anon_4821",
            "shared_interests": ["movies", "music"],
            "match_score_range": [0.7, 1.0],
            "match_reason_contains": ["music", "movies"],
            "no_user_id": True,
        }
    ],
}

# ---------------------------------------------------------------------------
# 19. friend_matching — low-score match filtered out
# ---------------------------------------------------------------------------

FRIEND_MATCH_LOW_SCORE_FILTERED = {
    "description": "Candidate with score below min_score threshold should be excluded",
    "function": "recommend_friends",
    "input": {
        "user_profile": {
            "interests": ["coding"],
            "conversation_style": "deep",
            "social_style": "outgoing",
        },
        "candidates": [
            {
                "user_id": "user789",
                "anonymous_id": "anon_9912",
                "profile": {
                    "interests": ["fashion", "food"],
                    "conversation_style": "energetic",
                    "social_style": "balanced",
                },
            }
        ],
        "min_score": 0.4,
    },
    "expected_output": [],
    "notes": "No shared interests — score will be very low, candidate should be filtered out.",
}

# ---------------------------------------------------------------------------
# All examples as a list (useful for iteration in tests)
# ---------------------------------------------------------------------------

ALL_EXAMPLES = [
    CHAT_LONELY_USER,
    CHAT_MUSIC_INTEREST,
    CHAT_SHY_USER,
    CHAT_CRISIS,
    CHAT_SENSITIVE_INFO,
    DAILY_QUESTION_NO_PROFILE,
    DAILY_QUESTION_MUSIC_INTEREST,
    TASK_GENERATION_SHY_LONELY,
    PROFILE_ANALYSIS_CLEAR,
    PROFILE_ANALYSIS_WEAK,
    TASK_REASON_EXAMPLE,
    FRIEND_REASON_EXAMPLE,
    # task_logic examples
    TASK_LOGIC_WALKING,
    TASK_LOGIC_MUSIC,
    TASK_LOGIC_CLEANING,
    TASK_LOGIC_SHY_USER,
    TASK_LOGIC_OUTGOING_USER,
    # friend_matching examples
    FRIEND_MATCH_HIGH_SCORE,
    FRIEND_MATCH_LOW_SCORE_FILTERED,
]
