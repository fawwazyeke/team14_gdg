"""
Mission service — AI mission generation, personalised by score + interests.

Difficulty calibration by stability_score:
  0–36   AI_START          → easy only, solo, no social pressure
  36–60  MISSION_PRACTICE  → mostly easy, one medium allowed
  60–100 READY_TO_CONNECT  → easy + medium, light social ok
  100+   CONNECTING        → any difficulty including social
"""

from typing import Optional

from ai_logic import recommend_tasks
from ai_logic.prompts import build_task_generation_prompt, CHATBOT_SYSTEM_PROMPT
from app.services.gemini_service import generate_json


def _difficulty_instruction(score: float) -> str:
    if score < 36:
        return (
            "DIFFICULTY RULE: Generate EASY missions only. "
            "Solo, low-pressure activities. No social interaction required."
        )
    if score < 60:
        return (
            "DIFFICULTY RULE: Mostly easy missions. "
            "One medium-difficulty mission is allowed if it is low-pressure."
        )
    if score < 100:
        return (
            "DIFFICULTY RULE: Mix of easy and medium. "
            "One mission may involve light, optional social interaction."
        )
    return (
        "DIFFICULTY RULE: Any difficulty. "
        "Include a mix — easy, medium, and one that gently challenges social comfort."
    )


def generate_rule_based_missions(
    user_profile: dict,
    completed_task_ids: Optional[list] = None,
    current_mood: Optional[str] = None,
    count: int = 3,
) -> list[dict]:
    """
    Rule-based mission generation (no Gemini). Used as fallback.
    Returns list of { title, description, difficulty, category, stability_delta }.
    """
    result = recommend_tasks(
        user_profile=user_profile,
        completed_task_ids=completed_task_ids,
        current_mood=current_mood,
        count=count,
    )
    items = result.get("tasks", [])
    missions = []
    for item in items:
        # recommend_tasks returns {"task": {...}, "reason": "...", "score": ...}
        task = item.get("task", {}) if isinstance(item, dict) and "task" in item else item
        missions.append({
            "title": task.get("title", "Today's mission"),
            "description": task.get("description", ""),
            "difficulty": task.get("difficulty", "easy"),
            "category": task.get("category", "wellness"),
            "stability_delta": float(task.get("estimated_minutes", 3)),
        })

    if not missions:
        return [_fallback_mission() for _ in range(count)]
    return missions


def generate_rule_based_mission(
    user_profile: dict,
    completed_task_ids: Optional[list] = None,
    current_mood: Optional[str] = None,
) -> dict:
    """ai_logic 규칙 기반 엔진으로 미션 1개 생성. Gemini 호출 없이 오프라인으로 작동."""
    return generate_rule_based_missions(user_profile, completed_task_ids, current_mood, count=1)[0]


def generate_ai_missions(
    user_profile: dict,
    completed_task_ids: Optional[list] = None,
    current_mood: Optional[str] = None,
    count: int = 3,
) -> list[dict]:
    """
    Generate count personalised missions via Gemini.
    Injects score-based difficulty calibration into the prompt.
    Falls back to rule-based if Gemini fails.
    """
    score = float(user_profile.get("stability_score", 0))
    difficulty_note = _difficulty_instruction(score)

    enriched_profile = {
        **user_profile,
        "_difficulty_instruction": difficulty_note,
        "_stability_score": score,
    }

    prompt = build_task_generation_prompt(
        user_profile=enriched_profile,
        completed_task_ids=completed_task_ids,
        current_mood=current_mood,
        count=count,
    )
    prompt = prompt + f"\n\n## Difficulty calibration\n{difficulty_note}"

    result = generate_json(prompt=prompt, system_instruction=CHATBOT_SYSTEM_PROMPT)
    tasks = (result or {}).get("tasks", [])

    if not tasks:
        return generate_rule_based_missions(user_profile, completed_task_ids, current_mood, count)

    missions = []
    for t in tasks[:count]:
        raw_delta = t.get("stability_delta") or t.get("estimated_minutes") or 3
        missions.append({
            "title": t.get("title", "Today's mission"),
            "description": t.get("description", ""),
            "difficulty": t.get("difficulty", "easy"),
            "category": t.get("category", "wellness"),
            "stability_delta": float(raw_delta),
        })
    return missions


def generate_ai_mission(
    user_profile: dict,
    completed_task_ids: Optional[list] = None,
    current_mood: Optional[str] = None,
) -> dict:
    return generate_ai_missions(user_profile, completed_task_ids, current_mood, count=1)[0]


def _fallback_mission() -> dict:
    return {
        "title": "Take a mindful moment",
        "description": "Step outside for 5 minutes and notice three things around you.",
        "difficulty": "easy",
        "category": "wellness",
        "stability_delta": 3.0,
    }
