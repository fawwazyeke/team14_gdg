"""
Mission service — Firestore 기반 AI 미션 생성.

기본 미션 (is_ai_generated=False): 라우터에서 직접 CRUD 처리.
AI 미션  (is_ai_generated=True):  이 서비스에서 ai_logic으로 생성 후 Firestore 저장.
"""

from typing import Optional

from ai_logic import recommend_tasks
from ai_logic.prompts import build_task_generation_prompt, CHATBOT_SYSTEM_PROMPT
from app.services.gemini_service import generate_json


def generate_rule_based_mission(
    user_profile: dict,
    completed_task_ids: Optional[list] = None,
    current_mood: Optional[str] = None,
) -> dict:
    """
    ai_logic 규칙 기반 엔진으로 미션 1개 생성.
    Gemini 호출 없이 오프라인으로 작동.
    반환: { title, description, difficulty, stability_delta }
    """
    result = recommend_tasks(
        user_profile=user_profile,
        completed_task_ids=completed_task_ids,
        current_mood=current_mood,
        count=1,
    )
    tasks = result.get("tasks", [])
    if not tasks:
        return _fallback_mission()

    t = tasks[0]
    return {
        "title": t.get("title", "오늘의 미션"),
        "description": t.get("description", ""),
        "difficulty": t.get("difficulty", "easy"),
        "stability_delta": t.get("stability_delta", 3),
    }


def generate_ai_mission(
    user_profile: dict,
    completed_task_ids: Optional[list] = None,
    current_mood: Optional[str] = None,
) -> dict:
    """
    Gemini로 개인화 AI 미션 생성.
    실패 시 규칙 기반으로 폴백.
    반환: { title, description, difficulty, stability_delta }
    """
    prompt = build_task_generation_prompt(
        user_profile=user_profile,
        completed_task_ids=completed_task_ids,
        current_mood=current_mood,
        count=1,
    )
    result = generate_json(prompt=prompt, system_instruction=CHATBOT_SYSTEM_PROMPT)

    tasks = (result or {}).get("tasks", [])
    if not tasks:
        return generate_rule_based_mission(user_profile, completed_task_ids, current_mood)

    t = tasks[0]
    return {
        "title": t.get("title", "오늘의 미션"),
        "description": t.get("description", ""),
        "difficulty": t.get("difficulty", "easy"),
        "stability_delta": t.get("stability_delta", 5),
    }


def _fallback_mission() -> dict:
    return {
        "title": "오늘 한 가지 친절한 행동 해보기",
        "description": "주변 사람에게 따뜻한 말 한마디나 작은 도움을 건네보세요.",
        "difficulty": "easy",
        "stability_delta": 3,
    }
