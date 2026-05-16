"""
task_logic.py
Rule-based task recommendation engine for the companion chatbot app.

No external dependencies. No Gemini calls. No FastAPI. No DB.
The backend imports these functions directly.
"""

from __future__ import annotations

import random
from typing import Optional


# ---------------------------------------------------------------------------
# Default task pool
# ---------------------------------------------------------------------------

_DEFAULT_TASKS: list[dict] = [
    # --- Walking / Outdoor ---
    {
        "id": "task_001",
        "title": "Take a 10-minute walk",
        "description": "Go outside and walk for just 10 minutes. No goal needed — just move a little.",
        "category": "walking",
        "difficulty": "easy",
        "estimated_minutes": 10,
        "tags": ["walking", "outdoor", "active", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_002",
        "title": "Step outside for 5 minutes",
        "description": "Open the door and stand or sit outside for 5 minutes. Fresh air is enough.",
        "category": "walking",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["walking", "outdoor", "low_pressure", "solo"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_003",
        "title": "Walk to the nearest corner and back",
        "description": "Just head to the nearest corner of your street and come back. That's it.",
        "category": "walking",
        "difficulty": "easy",
        "estimated_minutes": 7,
        "tags": ["walking", "outdoor", "active", "solo"],
        "pressure_level": "gentle",
    },

    # --- Music ---
    {
        "id": "task_004",
        "title": "Make a 5-song playlist",
        "description": "Put together 5 songs that match how you're feeling right now. No need to share it.",
        "category": "music",
        "difficulty": "easy",
        "estimated_minutes": 10,
        "tags": ["music", "solo", "creative", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_005",
        "title": "Listen to one song with your eyes closed",
        "description": "Pick a song you like and just listen — no screen, no multitasking.",
        "category": "music",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["music", "solo", "mindfulness", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_006",
        "title": "Find one new song you haven't heard before",
        "description": "Explore a playlist or recommendation and find one track that feels new to you.",
        "category": "music",
        "difficulty": "easy",
        "estimated_minutes": 10,
        "tags": ["music", "solo", "interest", "low_pressure"],
        "pressure_level": "gentle",
    },

    # --- Self-reflection / Emotion / Writing ---
    {
        "id": "task_007",
        "title": "Write one sentence about your mood",
        "description": "How are you feeling right now? Write just one sentence — no pressure to explain.",
        "category": "self_reflection",
        "difficulty": "easy",
        "estimated_minutes": 3,
        "tags": ["writing", "solo", "low_pressure", "self_reflection"],
        "pressure_level": "none",
    },
    {
        "id": "task_008",
        "title": "Write down one thing you are grateful for",
        "description": "Think of anything — big or small — that you appreciate today, and write it down.",
        "category": "gratitude",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["writing", "solo", "gratitude", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_009",
        "title": "Write one line from a song or movie you like",
        "description": "Pick a lyric or a quote that has stayed with you, and write it somewhere.",
        "category": "writing",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["writing", "solo", "interest", "music", "movies", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_010",
        "title": "Write a short anonymous self-introduction",
        "description": "Write 2–3 sentences about yourself — interests, vibe, what you enjoy. No name needed.",
        "category": "profile",
        "difficulty": "easy",
        "estimated_minutes": 7,
        "tags": ["writing", "solo", "profile", "low_pressure"],
        "pressure_level": "gentle",
    },

    # --- Wellness / Health ---
    {
        "id": "task_011",
        "title": "Drink a glass of water",
        "description": "Go grab a glass of water right now. Simple, and it helps.",
        "category": "health",
        "difficulty": "easy",
        "estimated_minutes": 2,
        "tags": ["health", "solo", "low_pressure", "routine"],
        "pressure_level": "none",
    },
    {
        "id": "task_012",
        "title": "Stretch for 5 minutes",
        "description": "Roll your shoulders, stretch your neck, reach your arms up. Just 5 minutes.",
        "category": "wellness",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["wellness", "fitness", "solo", "low_pressure", "active"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_013",
        "title": "Open the window for 3 minutes",
        "description": "Let some fresh air in. Stand by the window and breathe for a moment.",
        "category": "wellness",
        "difficulty": "easy",
        "estimated_minutes": 3,
        "tags": ["wellness", "solo", "low_pressure", "routine"],
        "pressure_level": "none",
    },
    {
        "id": "task_014",
        "title": "Take 5 slow deep breaths",
        "description": "Breathe in for 4 counts, hold for 2, breathe out for 6. Do it 5 times.",
        "category": "mindfulness",
        "difficulty": "easy",
        "estimated_minutes": 3,
        "tags": ["mindfulness", "wellness", "solo", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_015",
        "title": "Prepare one simple snack or meal",
        "description": "Make something simple — toast, fruit, a snack. Take care of yourself for a moment.",
        "category": "food",
        "difficulty": "easy",
        "estimated_minutes": 10,
        "tags": ["food", "solo", "routine", "low_pressure"],
        "pressure_level": "gentle",
    },

    # --- Cleaning / Routine ---
    {
        "id": "task_016",
        "title": "Wash 3 dishes",
        "description": "Just 3 dishes — not the whole kitchen. Small wins count.",
        "category": "cleaning",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["cleaning", "solo", "routine", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_017",
        "title": "Clean one corner of your room",
        "description": "Pick one corner — just one — and tidy it up a little.",
        "category": "cleaning",
        "difficulty": "easy",
        "estimated_minutes": 10,
        "tags": ["cleaning", "solo", "routine", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_018",
        "title": "Make your bed",
        "description": "Pull up the covers and straighten out your pillow. That's all — done.",
        "category": "cleaning",
        "difficulty": "easy",
        "estimated_minutes": 3,
        "tags": ["cleaning", "routine", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_019",
        "title": "Put away 5 items in your room",
        "description": "Find 5 things out of place and put them where they belong. Five, not fifty.",
        "category": "cleaning",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["cleaning", "routine", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_020",
        "title": "Throw away 3 things you don't need",
        "description": "Look around and find 3 things to toss — wrappers, old notes, anything.",
        "category": "cleaning",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["cleaning", "routine", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },

    # --- Entertainment / Movies / Reading ---
    {
        "id": "task_021",
        "title": "Watch one short comforting video",
        "description": "Watch something cozy — a short film, a calming clip, whatever feels good.",
        "category": "movies",
        "difficulty": "easy",
        "estimated_minutes": 10,
        "tags": ["movies", "entertainment", "solo", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_022",
        "title": "Read 2 pages of something",
        "description": "A book, an article, anything — just 2 pages. Pick up where you left off.",
        "category": "entertainment",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["reading", "solo", "interest", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_023",
        "title": "Write down the title of one book or movie you want to try",
        "description": "Just one — something you've been meaning to check out. Write it down so you remember.",
        "category": "planning",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["planning", "movies", "reading", "solo", "low_pressure"],
        "pressure_level": "none",
    },

    # --- Interest / Hobby ---
    {
        "id": "task_024",
        "title": "Choose 3 interest tags",
        "description": "Think about what you enjoy and pick 3 words that describe your interests.",
        "category": "profile",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["interest", "solo", "profile", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_025",
        "title": "Browse photos of something you find beautiful",
        "description": "Nature, architecture, art, animals — spend 5 minutes looking at things you find pleasing.",
        "category": "interest",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["art", "interest", "solo", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_026",
        "title": "Spend 10 minutes on a hobby you haven't touched lately",
        "description": "Pick up something you used to enjoy, even briefly. Drawing, gaming, reading — anything.",
        "category": "interest",
        "difficulty": "easy",
        "estimated_minutes": 10,
        "tags": ["interest", "solo", "creative", "low_pressure"],
        "pressure_level": "gentle",
    },

    # --- Fitness / Movement ---
    {
        "id": "task_027",
        "title": "Do 10 gentle jumping jacks",
        "description": "Just 10 — light and easy. Move your body for 30 seconds.",
        "category": "fitness",
        "difficulty": "easy",
        "estimated_minutes": 3,
        "tags": ["fitness", "active", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_028",
        "title": "Walk around your home 3 times",
        "description": "Circle your home 3 times. It counts as movement.",
        "category": "fitness",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["walking", "fitness", "indoor", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },

    # --- Social (light, low pressure) ---
    {
        "id": "task_029",
        "title": "Send a short 'how are you?' message to one person",
        "description": "Just one message — short and simple. It doesn't need to start a long conversation.",
        "category": "social",
        "difficulty": "medium",
        "estimated_minutes": 5,
        "tags": ["social", "friendship", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_030",
        "title": "Think of one question to ask an anonymous friend",
        "description": "Come up with one friendly, light question you'd feel comfortable asking someone new.",
        "category": "friendship",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["social", "friendship", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_031",
        "title": "Reply to one message you've been putting off",
        "description": "Find one message you haven't replied to yet and send a short, casual reply.",
        "category": "social",
        "difficulty": "medium",
        "estimated_minutes": 5,
        "tags": ["social", "friendship", "low_pressure"],
        "pressure_level": "moderate",
    },

    # --- Mindfulness / Grounding ---
    {
        "id": "task_032",
        "title": "Look out the window for 2 minutes",
        "description": "Find a window and just look outside for 2 minutes. Notice what's there.",
        "category": "mindfulness",
        "difficulty": "easy",
        "estimated_minutes": 2,
        "tags": ["mindfulness", "solo", "low_pressure", "wellness"],
        "pressure_level": "none",
    },
    {
        "id": "task_033",
        "title": "Name 3 things you can see right now",
        "description": "Look around and name 3 things in your space. A simple grounding exercise.",
        "category": "mindfulness",
        "difficulty": "easy",
        "estimated_minutes": 2,
        "tags": ["mindfulness", "solo", "low_pressure", "wellness"],
        "pressure_level": "none",
    },
    {
        "id": "task_034",
        "title": "Sit quietly for 3 minutes — no phone",
        "description": "Put the phone down and just sit for 3 minutes. No pressure to do anything.",
        "category": "mindfulness",
        "difficulty": "easy",
        "estimated_minutes": 3,
        "tags": ["mindfulness", "solo", "low_pressure", "wellness"],
        "pressure_level": "none",
    },

    # --- Self-compassion ---
    {
        "id": "task_035",
        "title": "Write one kind thing about yourself",
        "description": "Write one thing — big or small — that you did well recently or that you like about yourself.",
        "category": "self_compassion",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["self_compassion", "writing", "solo", "low_pressure"],
        "pressure_level": "none",
    },
    {
        "id": "task_036",
        "title": "Say something encouraging to yourself out loud",
        "description": "Stand in front of a mirror or just say it quietly — one encouraging sentence.",
        "category": "self_compassion",
        "difficulty": "easy",
        "estimated_minutes": 2,
        "tags": ["self_compassion", "solo", "low_pressure", "wellness"],
        "pressure_level": "none",
    },

    # --- Planning / Routine ---
    {
        "id": "task_037",
        "title": "Write one small goal for tomorrow",
        "description": "One thing — anything — you want to do tomorrow. Keep it small and realistic.",
        "category": "planning",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["planning", "writing", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_038",
        "title": "Organize one small area of your desk or table",
        "description": "Clear one small spot — a corner of your desk, the table next to you. Just that spot.",
        "category": "cleaning",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["cleaning", "routine", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },

    # --- Food / Cafe / Comfort ---
    {
        "id": "task_039",
        "title": "Make yourself a warm drink",
        "description": "Tea, coffee, warm water — anything warm. Take a few minutes to enjoy it.",
        "category": "food",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["food", "cafe", "solo", "low_pressure", "wellness"],
        "pressure_level": "none",
    },
    {
        "id": "task_040",
        "title": "Eat one meal sitting down, without looking at your phone",
        "description": "Just one meal — sit, eat, and notice how the food tastes.",
        "category": "mindfulness",
        "difficulty": "easy",
        "estimated_minutes": 15,
        "tags": ["food", "mindfulness", "solo", "low_pressure"],
        "pressure_level": "gentle",
    },
    {
        "id": "task_041",
        "title": "Write a note to your future self",
        "description": "Write a short message to yourself one week from now. What do you hope feels better?",
        "category": "emotion",
        "difficulty": "easy",
        "estimated_minutes": 8,
        "tags": ["writing", "emotion", "solo", "low_pressure", "self_compassion"],
        "pressure_level": "none",
    },
    {
        "id": "task_042",
        "title": "Spend 5 minutes with a pet (or watch animal videos)",
        "description": "If you have a pet, spend a few minutes with them. If not, watch some cozy animal videos.",
        "category": "wellness",
        "difficulty": "easy",
        "estimated_minutes": 5,
        "tags": ["animals", "wellness", "solo", "low_pressure"],
        "pressure_level": "none",
    },
]

# ---------------------------------------------------------------------------
# Safe fallback task (used when no task scores well enough)
# ---------------------------------------------------------------------------

_FALLBACK_TASK: dict = {
    "id": "task_007",
    "title": "Write one sentence about your mood",
    "description": "How are you feeling right now? Write just one sentence — no pressure to explain.",
    "category": "self_reflection",
    "difficulty": "easy",
    "estimated_minutes": 3,
    "tags": ["writing", "solo", "low_pressure", "self_reflection"],
    "pressure_level": "none",
}

# ---------------------------------------------------------------------------
# Keyword maps for answer-based boosting
# ---------------------------------------------------------------------------

_WALKING_KEYWORDS = {"walk", "walking", "outside", "outdoor", "park", "fresh air", "exercise", "stroll"}
_MUSIC_KEYWORDS = {"music", "playlist", "song", "songs", "artist", "concert", "listen", "album", "track"}
_CLEANING_KEYWORDS = {"messy", "mess", "dirty", "stuck", "unmotivated", "lazy", "cluttered", "disorganized", "tired", "exhausted"}
_SOCIAL_KEYWORDS = {"friend", "friends", "talk", "chat", "message", "lonely", "alone", "people", "someone"}

_HIGH_LONELINESS_PREFERRED_CATEGORIES = {
    "self_reflection", "music", "walking", "wellness", "gratitude",
    "cleaning", "routine", "mindfulness", "self_compassion",
}

_GROUNDING_TAGS = {"low_pressure", "solo", "mindfulness", "wellness", "self_compassion"}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def normalize_list(values: list | None) -> list[str]:
    """Return a lowercase stripped list, ignoring None or empty values."""
    if not values:
        return []
    return [str(v).strip().lower() for v in values if v]


def text_contains_any(text: str, keywords: set[str]) -> bool:
    """Return True if any keyword appears in the lowercased text."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)


def infer_interest_keywords_from_answers(recent_answers: list[str] | None) -> dict[str, bool]:
    """
    Scan recent answers for interest signals.

    Returns a dict of booleans keyed by interest area:
      {
        "walking": True,
        "music": False,
        "cleaning": True,
        "social": False,
      }
    """
    combined = " ".join(recent_answers or [])
    return {
        "walking": text_contains_any(combined, _WALKING_KEYWORDS),
        "music": text_contains_any(combined, _MUSIC_KEYWORDS),
        "cleaning": text_contains_any(combined, _CLEANING_KEYWORDS),
        "social": text_contains_any(combined, _SOCIAL_KEYWORDS),
    }


def get_default_tasks() -> list[dict]:
    """Return a fresh copy of the default task pool."""
    import copy
    return copy.deepcopy(_DEFAULT_TASKS)


# ---------------------------------------------------------------------------
# Core scoring function
# ---------------------------------------------------------------------------

def score_task(
    task: dict,
    user_profile: dict,
    recent_answers: list[str] | None = None,
    current_mood: str | None = None,
) -> float:
    """
    Score a single task against the user profile and context.

    Returns a float in roughly [0.0, 1.0+].
    Higher is better. Call recommend_task to pick the best one.
    """
    score = 0.0

    task_tags = normalize_list(task.get("tags", []))
    task_category = str(task.get("category", "")).lower()
    task_difficulty = str(task.get("difficulty", "easy")).lower()
    task_pressure = str(task.get("pressure_level", "none")).lower()

    user_interests = normalize_list(user_profile.get("interests", []))
    user_task_prefs = normalize_list(user_profile.get("task_preference", []))
    social_style = str(user_profile.get("social_style") or "unknown").lower()
    loneliness_level = str(user_profile.get("loneliness_level") or "unknown").lower()
    mood = str(current_mood or "unknown").lower()

    # --- Interest overlap (+0.35) ---
    if user_interests and set(task_tags) & set(user_interests):
        score += 0.35

    # --- Task preference overlap (+0.25) ---
    if user_task_prefs and set(task_tags) & set(user_task_prefs):
        score += 0.25

    # --- Mood adjustments ---
    if mood in {"tired", "sad", "lonely", "anxious"}:
        if task_difficulty == "easy":
            score += 0.15
        if task_pressure == "none":
            score += 0.10
        if "low_pressure" in task_tags:
            score += 0.05
        if task_difficulty == "hard" or task_pressure == "moderate":
            score -= 0.20

    if mood in {"happy", "excited"}:
        if task_difficulty in {"medium", "hard"}:
            score += 0.05

    # --- Social style adjustments ---
    if social_style in {"shy", "slow_to_open_up"}:
        if task_category == "social" and task_difficulty in {"medium", "hard"}:
            score -= 0.30
        if "social" in task_tags and task_pressure == "moderate":
            score -= 0.20
        if "solo" in task_tags:
            score += 0.10

    if social_style == "outgoing":
        if task_category in {"social", "friendship"}:
            score += 0.15

    # --- Loneliness level adjustments ---
    if loneliness_level == "high":
        if task_category in _HIGH_LONELINESS_PREFERRED_CATEGORIES:
            score += 0.15
        if set(task_tags) & _GROUNDING_TAGS:
            score += 0.10
        if task_category == "social" and task_difficulty in {"medium", "hard"}:
            score -= 0.15

    # --- Answer-based keyword boosting ---
    signals = infer_interest_keywords_from_answers(recent_answers)

    if signals["walking"] and task_category in {"walking", "fitness"}:
        score += 0.20
    if signals["walking"] and "outdoor" in task_tags:
        score += 0.10

    if signals["music"] and task_category == "music":
        score += 0.20
    if signals["music"] and "music" in task_tags:
        score += 0.10

    if signals["cleaning"] and task_category == "cleaning":
        score += 0.20
    if signals["cleaning"] and task_category == "routine":
        score += 0.10

    if signals["social"] and task_category in {"social", "friendship"}:
        if social_style not in {"shy", "slow_to_open_up"}:
            score += 0.10

    return round(max(0.0, score), 4)


# ---------------------------------------------------------------------------
# Build result
# ---------------------------------------------------------------------------

def build_task_result(
    task: dict,
    user_profile: dict,
    score: float,
) -> dict:
    """
    Wrap a task with a warm reason sentence and score.

    The reason is rule-based. For richer natural language use
    build_task_recommendation_reason_prompt from prompts.py and call Gemini.
    """
    user_interests = normalize_list(user_profile.get("interests", []))
    social_style = str(user_profile.get("social_style") or "unknown").lower()
    loneliness_level = str(user_profile.get("loneliness_level") or "unknown").lower()

    task_tags = normalize_list(task.get("tags", []))
    overlapping = [i for i in user_interests if i in task_tags]

    # Build a simple warm reason
    if overlapping:
        interest_str = " and ".join(overlapping)
        reason = (
            f"Since you enjoy {interest_str}, this felt like a natural and low-pressure way "
            f"to spend a little time today."
        )
    elif loneliness_level == "high":
        reason = (
            "When things feel heavy, small and gentle activities can help you feel a bit more grounded. "
            "This one is easy to start on your own."
        )
    elif social_style in {"shy", "slow_to_open_up"}:
        reason = (
            "This is something you can do entirely on your own, at your own pace — "
            "no pressure involved."
        )
    else:
        reason = (
            "This is a small, manageable activity that can help shift your mood a little "
            "without needing much energy."
        )

    return {
        "task": task,
        "reason": reason,
        "score": score,
    }


# ---------------------------------------------------------------------------
# Internal: shared scoring + ranking logic
# ---------------------------------------------------------------------------

def _rank_tasks(
    user_profile: dict,
    recent_answers: list[str] | None,
    completed_task_ids: list[str] | None,
    current_mood: str | None,
) -> list[tuple[float, dict]]:
    """Score all eligible tasks and return them sorted best-first."""
    completed_ids = set(normalize_list(completed_task_ids))
    tasks = [t for t in get_default_tasks() if t["id"] not in completed_ids]

    scored: list[tuple[float, dict]] = [
        (score_task(t, user_profile, recent_answers, current_mood), t)
        for t in tasks
    ]
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored


# ---------------------------------------------------------------------------
# recommend_task — pick the single best task (legacy / simple use case)
# ---------------------------------------------------------------------------

def recommend_task(
    user_profile: dict,
    recent_answers: list[str] | None = None,
    completed_task_ids: list[str] | None = None,
    current_mood: str | None = None,
) -> dict:
    """
    Recommend the single best-fitting task from the default pool.

    Note: The app's Mission screen uses recommend_tasks() to show 3 options.
    Use this function when you only need one task (e.g. chat-based suggestion).

    Returns:
        {"task": {...}, "reason": "...", "score": 0.87}
    """
    scored = _rank_tasks(user_profile, recent_answers, completed_task_ids, current_mood)

    if not scored or scored[0][0] < 0.05:
        return build_task_result(_FALLBACK_TASK, user_profile, 0.0)

    top_score = scored[0][0]
    top_candidates = [(s, t) for s, t in scored if s >= top_score - 0.05]
    best_score, best_task = random.choice(top_candidates)
    return build_task_result(best_task, user_profile, best_score)


# ---------------------------------------------------------------------------
# recommend_tasks — pick N distinct tasks for the Mission screen
# ---------------------------------------------------------------------------

def recommend_tasks(
    user_profile: dict,
    recent_answers: list[str] | None = None,
    completed_task_ids: list[str] | None = None,
    current_mood: str | None = None,
    count: int = 3,
) -> dict:
    """
    Recommend `count` distinct task options for the Mission screen.

    The app displays all options and lets the user choose one.
    Tasks are picked in score order, with category diversity enforced so
    the user doesn't see three identical-category tasks.

    Args:
        user_profile: Dict with interests (user-selected), social_style,
                      loneliness_level, task_preference.
        recent_answers: Recent daily-question answers for keyword signals.
        completed_task_ids: Already-completed task IDs to exclude.
        current_mood: Detected emotion string (e.g. "lonely", "tired").
        count: Number of task options to return (default 3).

    Returns:
        {
          "tasks": [
            {"task": {...}, "reason": "...", "score": 0.87},
            {"task": {...}, "reason": "...", "score": 0.74},
            {"task": {...}, "reason": "...", "score": 0.61},
          ],
          "safety_note": "Take your time — there's no rush to pick one."
        }
    """
    scored = _rank_tasks(user_profile, recent_answers, completed_task_ids, current_mood)

    selected: list[dict] = []
    used_categories: set[str] = set()

    # First pass: pick top-scoring tasks with category diversity
    for task_score, task in scored:
        if len(selected) >= count:
            break
        category = task.get("category", "other")
        if category not in used_categories:
            selected.append(build_task_result(task, user_profile, task_score))
            used_categories.add(category)

    # Second pass: fill remaining slots if diversity requirement exhausted the pool
    if len(selected) < count:
        selected_ids = {r["task"]["id"] for r in selected}
        for task_score, task in scored:
            if len(selected) >= count:
                break
            if task["id"] not in selected_ids:
                selected.append(build_task_result(task, user_profile, task_score))
                selected_ids.add(task["id"])

    # Pad with fallback if pool was very small
    while len(selected) < count:
        selected.append(build_task_result(_FALLBACK_TASK, user_profile, 0.0))

    loneliness = str(user_profile.get("loneliness_level") or "").lower()
    if loneliness == "high":
        safety_note = "Any one of these is a great start — even finishing just part of it is enough."
    else:
        safety_note = "Take your time — there's no rush. Pick whichever feels right for today."

    return {
        "tasks": selected[:count],
        "safety_note": safety_note,
    }
