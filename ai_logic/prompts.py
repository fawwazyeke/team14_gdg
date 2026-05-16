"""
prompts.py
Reusable AI prompt builders for the companion chatbot.

All builders return a plain string that the backend Gemini service
should send as the user-turn content (with CHATBOT_SYSTEM_PROMPT as
the system instruction).

No external dependencies — pure Python.
"""

import json
from typing import Optional

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

CHATBOT_SYSTEM_PROMPT: str = """
You are a warm and friendly AI companion for people who may feel lonely.

## Core behavior
- Speak naturally in English unless the user uses another language.
- Be kind, calm, and emotionally supportive.
- Listen first before giving advice.
- Ask only one or two gentle questions at a time.
- Do not sound like a questionnaire or survey.
- Use casual but respectful English.
- Do not overuse emojis — use at most one per reply if appropriate.
- Do not pretend to be a human.
- Do not claim you can replace real friends, family, or professional support.
- Encourage small, realistic, pressure-free actions.
- Respect the user's pace and never push them.

## Tone and variety
Vary how you open and structure each reply — do not fall into the same pattern every time.
Phrases like "It sounds like...", "It seems like...", "That sounds...", or "Of course!" are fine occasionally,
but avoid leaning on them as a default opener in every message. If you notice yourself about to use
the same phrase as the previous reply, choose a different approach instead.

Some natural alternatives:
- Reflect a specific detail they mentioned ("Three hours on that level — that's a lot.")
- Match their energy — if they're brief, keep it brief.
- Ask directly about what they said ("Did that come out of nowhere?")
- Start with the feeling itself, not a label ("That kind of quiet can get heavy.")
- Sometimes just continue the thread without any opener.

Vary reply length with the user's message. A 3-word message usually doesn't need a paragraph back.

## User interests
The user has already selected their interests directly in the app (e.g. music, movies,
walking). You do NOT need to ask about interests during conversation.
If the user brings up an interest naturally, reflect it warmly — but never prompt them
to list or confirm their interests.

## Social comfort discovery
Never ask "Are your social skills low?" or anything that sounds clinical.
Use gentle, normalizing phrasing such as:
- "Do you tend to feel comfortable with new people pretty quickly, or does it take you a little time?"
- "Do you usually like to start conversations first, or do you prefer when someone else makes the first move?"
- "Do you enjoy talking with lots of people, or do you prefer getting close to just a few people slowly?"

## Privacy rules
Do NOT ask for:
- Real name, phone number, home address, exact location
- School name, workplace name
- SNS ID, KakaoTalk ID, or any messaging handle
If the user volunteers such information, do not repeat it and gently steer the
conversation to safe topics.

## Safety rules
- Do NOT diagnose the user with any medical or psychological condition.
- If the user expresses self-harm, suicidal thoughts, violence, or immediate danger,
  respond with empathy and encourage them to contact trusted people, emergency
  services (911 / local emergency number), or professional support.
  Set suggested_next_action to "safety_support".
- Do NOT shame or judge the user under any circumstances.

## Output format
- Return ONLY valid JSON. No markdown fences. No extra text outside JSON.
- The JSON structure must match the schema provided in each prompt exactly.
""".strip()


# ---------------------------------------------------------------------------
# 1. Chat response prompt builder
# ---------------------------------------------------------------------------

def build_chat_prompt(
    user_message: str,
    conversation_history: Optional[list[dict]] = None,
    user_profile: Optional[dict] = None,
) -> str:
    """
    Build the prompt for generating a chatbot reply.

    Args:
        user_message: The latest message from the user.
        conversation_history: List of previous turns as dicts with keys
            "role" ("user" | "assistant") and "content" (str).
            Keep to the last 10 turns maximum to avoid token overflow.
        user_profile: Current known profile dict (interests, social_style, etc.).

    Returns:
        Prompt string to send to Gemini as the user turn.
    """
    history_block = ""
    if conversation_history:
        formatted = []
        for turn in conversation_history[-10:]:
            role = turn.get("role", "unknown")
            content = turn.get("content", "")
            formatted.append(f"[{role}]: {content}")
        history_block = "\n".join(formatted)

    profile_block = ""
    if user_profile:
        profile_block = json.dumps(user_profile, ensure_ascii=False)

    prompt = f"""
You are processing a chat message from a user of our companion app for lonely people.

## Recent conversation history (oldest to newest)
{history_block if history_block else "(no prior history)"}

## Current user profile (may be incomplete)
{profile_block if profile_block else "(no profile data yet)"}

## User's latest message
\"\"\"{user_message}\"\"\"

## Task
Generate a warm, empathetic reply and extract non-sensitive profile signals.

## Rules
- reply: English (2-4 sentences). At most one gentle follow-up question.
- Match reply LENGTH to the user's message. Don't over-explain, but don't give bare one-liners either — a little warmth and substance goes a long way.
- Vary how you open each reply — avoid repeating the same opener as the previous message. Mirror their specific words, react to a concrete detail, or just continue the thread naturally.
- Do NOT stay stuck on the same emotion for more than 1-2 turns. Once a feeling is acknowledged, naturally move the conversation forward — bring up a related topic, ask about something in their day or interests, or gently shift to something lighter.
- Think of yourself as a friend having a real conversation: you acknowledge feelings, but you also talk about things, share curiosity, and help the conversation breathe and go somewhere.
- If the user sounds lonely, respond with empathy before asking anything.
- If the user mentions something related to their selected interests, reflect it naturally.
- Do NOT ask the user to list or confirm their interests — they already selected them in the app.
- If the user seems shy or hesitant, do not pressure them toward social actions.
- If you detect self-harm, suicide, violence, or immediate danger signals,
  set suggested_next_action to "safety_support" and reply with empathy + crisis resources.
- If the user shares sensitive personal information (phone, address, school, SNS ID),
  do not store or repeat it; gently redirect the conversation.
- Do NOT diagnose or judge.
- profile_update_hint must only contain non-sensitive inferred signals. Use null if uncertain.
- interests in profile_update_hint: only fill if the user explicitly mentions a new interest
  not already in their profile — otherwise leave as an empty list.

## Required JSON output (return ONLY this, no markdown)
{{
  "reply": "<English reply string>",
  "detected_emotion": "<neutral|happy|sad|lonely|anxious|tired|angry|excited|unknown>",
  "suggested_next_action": "<continue_conversation|suggest_friend_matching|safety_support>",
  "profile_update_hint": {{
    "interests": ["<new interest not already in profile, or empty list>"],
    "social_style": "<outgoing|balanced|slow_to_open_up|shy|unknown|null>",
    "conversation_style": "<calm|humorous|deep|casual|energetic|unknown|null>",
    "loneliness_level": "<low|medium|high|unknown|null>"
  }}
}}
""".strip()

    return prompt


# ---------------------------------------------------------------------------
# 2. Daily question prompt builder
# ---------------------------------------------------------------------------

def build_daily_question_prompt(
    user_profile: Optional[dict] = None,
    recent_answers: Optional[list[str]] = None,
) -> str:
    """
    Build a prompt to generate one gentle daily question.

    Args:
        user_profile: Known profile (interests, social_style, loneliness_level, etc.).
        recent_answers: List of the user's recent daily-question answers (last 5 max).

    Returns:
        Prompt string to send to Gemini.
    """
    profile_block = json.dumps(user_profile, ensure_ascii=False) if user_profile else "(none)"
    answers_block = (
        "\n".join(f"- {a}" for a in recent_answers[-5:]) if recent_answers else "(none)"
    )

    prompt = f"""
You are generating a single daily check-in question for a user of our companion app.

## User profile
{profile_block}

## User's recent daily-question answers
{answers_block}

## Task
Create one short, natural English question that:
- Helps the user reflect on their mood, day, or social comfort
- Does NOT sound like a survey or questionnaire
- Does NOT ask the user to list or confirm their interests — they already selected those in the app
- Avoids asking multiple things at once
- Avoids all sensitive personal information (name, phone, address, school, etc.)
- Matches the user's profile:
  * If social_style is "shy" -> choose a low-pressure, solo-reflection question
  * If user has a specific interest -> optionally ask about how that interest felt today (mood-linked)
  * Vary question_type from recent history if possible

## Example questions (for inspiration only - do not copy verbatim)
- "If you had to describe today in one word, what would it be?"
- "Did you get a chance to do anything today that helped you unwind?"
- "When you meet new people, do you tend to warm up slowly or pretty quickly?"
- "Does today feel more like a quiet solo day, or a day where you'd enjoy talking with someone?"

## Required JSON output (return ONLY this, no markdown)
{{
  "question": "<English question string>",
  "question_type": "<mood_check|social_comfort|routine|light_fun>",
  "reason": "<brief internal reason for choosing this question>"
}}
""".strip()

    return prompt


# ---------------------------------------------------------------------------
# 3. Mission / task generation prompt builder
# ---------------------------------------------------------------------------

def build_task_generation_prompt(
    user_profile: dict,
    completed_task_ids: Optional[list[str]] = None,
    current_mood: Optional[str] = None,
    count: int = 3,
) -> str:
    """
    Build a prompt to generate a set of personalized mission/task options.

    The app displays these on a dedicated Mission screen where the user picks one.
    Always generate exactly `count` distinct tasks (default 3).

    Args:
        user_profile: Required. Interests are already selected by the user in the app.
                      Should include: interests, social_style, loneliness_level, task_preference.
        completed_task_ids: IDs of tasks the user has already done — avoid repeating them.
        current_mood: Detected emotion string (e.g. "lonely", "tired").
        count: Number of task options to generate (default 3).

    Returns:
        Prompt string to send to Gemini.
    """
    profile_block = json.dumps(user_profile, ensure_ascii=False)

    ids_block = "(none)"
    if completed_task_ids:
        ids_block = ", ".join(completed_task_ids[-10:])

    mood_line = f"Current detected mood: {current_mood}" if current_mood else "Current mood: unknown"

    prompt = f"""
You are generating {count} personalized mission/task options for the Mission screen of our companion app.
The user will see all {count} options and choose one to complete.

## User profile (interests were selected by the user — do not ask about them)
{profile_block}

## Recently completed task IDs (do not repeat these)
{ids_block}

## {mood_line}

## Task generation rules
- Generate exactly {count} DISTINCT tasks. No duplicates.
- Each task must be small, realistic, and emotionally safe.
- Tasks should gently reduce loneliness without applying pressure.
- estimated_minutes should usually be 15 or fewer.
- Vary categories across the {count} tasks — do not give all tasks the same category.
- Prefer "easy" difficulty for users who are lonely, shy, or tired.
- Do NOT recommend difficult social tasks (e.g. "go talk to a stranger") to shy users.
- Match tasks to the user's selected interests where possible.
- If loneliness_level is "high" -> include at least one grounding or self-compassion task.
- Do NOT require personal information disclosure.
- Do NOT require meeting strangers in person.
- Each reason should be warm and feel personal to this user.

## Required JSON output (return ONLY this, no markdown)
{{
  "tasks": [
    {{
      "title": "<short English task title>",
      "description": "<1-2 sentence English description>",
      "category": "<self_reflection|music|walking|wellness|gratitude|writing|movies|health|food|routine|cleaning|interest|social|fitness|entertainment|planning|mindfulness|friendship|emotion|self_compassion|other>",
      "difficulty": "<easy|medium|hard>",
      "estimated_minutes": <integer>,
      "tags": ["<tag1>", "<tag2>"],
      "pressure_level": "<none|gentle|moderate>",
      "reason": "<warm 1-2 sentence English explanation for why this specific task suits this user>"
    }}
  ],
  "safety_note": "<one reassuring sentence shown below all tasks>"
}}
""".strip()

    return prompt


# ---------------------------------------------------------------------------
# 4. User profile analysis prompt builder
# ---------------------------------------------------------------------------

def build_profile_analysis_prompt(
    messages: list[str],
    current_profile: Optional[dict] = None,
) -> str:
    """
    Build a prompt to analyse conversation messages and extract profile signals.

    Args:
        messages: List of user message strings (user side only, not full turns).
        current_profile: Existing profile to merge/update.

    Returns:
        Prompt string to send to Gemini.
    """
    messages_block = "\n".join(f"- {m}" for m in messages)
    profile_block = json.dumps(current_profile, ensure_ascii=False) if current_profile else "(none)"

    prompt = f"""
You are analyzing a user's conversation messages to build a non-sensitive profile.

## Existing profile (may be updated)
{profile_block}

## User messages to analyze
{messages_block}

## Analysis rules
- The user's interests are already stored in their profile (they selected them in the app).
  Do NOT attempt to extract or update interests from conversation messages.
  Leave the interests field unchanged from the existing profile.
- Extract ONLY non-sensitive conversational signals: social_style, conversation_style, loneliness_level.
- IGNORE and do NOT record: real names, phone numbers, addresses, exact locations,
  school names, workplace names, SNS IDs, KakaoTalk IDs, or any PII.
- Do NOT infer any medical or psychological diagnosis.
- Do NOT label the user negatively (e.g. "has poor social skills").
- Use "unknown" for any field where evidence is insufficient.
- If overall evidence is thin, set confidence to "low".
- summary must be respectful, neutral, and non-judgmental (English, 1-2 sentences).
- Merge new signals with the existing profile where they agree; keep "unknown" if conflicting.

## Allowed values
- interests: music | movies | games | sports | fitness | walking | food | cafe |
  reading | writing | photography | coding | travel | animals | animation |
  fashion | study | art | conversation | other
- social_style: outgoing | balanced | slow_to_open_up | shy | unknown
- conversation_style: calm | humorous | deep | casual | energetic | unknown
- loneliness_level: low | medium | high | unknown
- task_preference: easy | medium | challenging | indoor | outdoor | social |
  solo | low_pressure | creative | active

## Required JSON output (return ONLY this, no markdown)
{{
  "profile": {{
    "interests": ["<interest>"],
    "social_style": "<value>",
    "conversation_style": "<value>",
    "loneliness_level": "<value>",
    "task_preference": ["<preference>"]
  }},
  "summary": "<English summary>",
  "confidence": "<low|medium|high>"
}}
""".strip()

    return prompt


# ---------------------------------------------------------------------------
# 5. Task recommendation reason prompt builder
# ---------------------------------------------------------------------------

def build_task_recommendation_reason_prompt(
    user_profile: dict,
    selected_task: dict,
) -> str:
    """
    Build a prompt to generate a short, warm English explanation for a task recommendation.

    Args:
        user_profile: Known user profile dict.
        selected_task: The task dict that was selected for the user.

    Returns:
        Prompt string to send to Gemini.
    """
    profile_block = json.dumps(user_profile, ensure_ascii=False)
    task_block = json.dumps(selected_task, ensure_ascii=False)

    prompt = f"""
You are writing a short, warm English explanation for why a task was recommended
to a user of our companion app.

## User profile
{profile_block}

## Selected task
{task_block}

## Writing rules
- 1-2 sentences in English.
- Warm and natural, not clinical or robotic.
- Mention the user's interest or preference IF relevant
  (e.g. "Since you enjoy music, we thought...").
- Do NOT say "because your social skills are low" or anything judgmental.
- Instead use phrases like "Since you seem to prefer lower-pressure activities..."
  or "This is something you can start on your own at any pace..."
- Do NOT mention sensitive traits or private information.

## Required JSON output (return ONLY this, no markdown)
{{
  "reason": "<English explanation>"
}}
""".strip()

    return prompt


# ---------------------------------------------------------------------------
# 6. Friend recommendation explanation prompt builder
# ---------------------------------------------------------------------------

def build_friend_recommendation_reason_prompt(
    user_profile: dict,
    candidate_profile: dict,
    shared_interests: list[str],
    match_score: float,
) -> str:
    """
    Build a prompt to generate a user-facing anonymous friend match explanation.

    Args:
        user_profile: The current user's profile (no PII).
        candidate_profile: The candidate's profile (no PII - only interests and style).
        shared_interests: List of interest strings shared by both users.
        match_score: A float 0-1 representing overall compatibility.

    Returns:
        Prompt string to send to Gemini.
    """
    user_block = json.dumps(user_profile, ensure_ascii=False)
    candidate_block = json.dumps(candidate_profile, ensure_ascii=False)
    shared_block = ", ".join(shared_interests) if shared_interests else "(none)"

    prompt = f"""
You are generating a friendly, anonymous friend match explanation for a user
of our companion app.

## User's profile
{user_block}

## Candidate's profile (anonymous - no identity, no user ID)
{candidate_block}

## Shared interests
{shared_block}

## Match score (0 = low compatibility, 1 = perfect match)
{match_score:.2f}

## Writing rules
- Do NOT reveal real identity, user_id, or any PII of either user.
- Base the explanation ONLY on shared interests and compatible conversation style.
- match_reason: 1-2 warm English sentences explaining why they might get along.
- conversation_starter: One safe, interest-based English opener the user can try.
- Keep tone friendly and low-pressure.
- Do NOT push the user into uncomfortable social situations.

## Required JSON output (return ONLY this, no markdown)
{{
  "match_reason": "<English explanation>",
  "conversation_starter": "<English conversation starter>"
}}
""".strip()

    return prompt


# ---------------------------------------------------------------------------
# 7. Event feedback chat prompt builder
# ---------------------------------------------------------------------------

EVENT_FEEDBACK_SYSTEM_PROMPT: str = """
You are a warm companion helping a user reflect on a real-world social event they attended.

## Your role
- Gently draw out how the event went: what they did, who they met, how they felt.
- Celebrate small wins — even just showing up is meaningful.
- If they found it difficult or awkward, normalise that without judgment.
- Ask one follow-up question at a time. Keep replies 2-3 sentences.
- Do NOT ask for personal details (full name, contact info, etc.).
- Do NOT diagnose or label the user.
- Vary your openers and avoid repetitive phrasing.

## Output format
Return ONLY valid JSON. No markdown. No extra text.
""".strip()


def build_event_feedback_prompt(
    event_title: str,
    conversation_history: list[dict],
    user_message: str,
) -> str:
    history_block = ""
    if conversation_history:
        lines = [f"[{t['role']}]: {t['content']}" for t in conversation_history[-10:]]
        history_block = "\n".join(lines)

    return f"""
The user attended this event: "{event_title}"

## Conversation so far
{history_block if history_block else "(this is the opening message)"}

## User's latest message
\"\"\"{user_message}\"\"\"

## Task
Reply warmly and draw out their reflection about the event experience.
Ask one gentle follow-up question if appropriate.

## Required JSON output (return ONLY this, no markdown)
{{
  "reply": "<English reply, 2-3 sentences>"
}}
""".strip()


# ---------------------------------------------------------------------------
# 8. Event reflection scoring prompt
# ---------------------------------------------------------------------------

def build_event_reflection_score_prompt(
    event_title: str,
    conversation_history: list[dict],
) -> str:
    lines = [f"[{t['role']}]: {t['content']}" for t in conversation_history]
    history_block = "\n".join(lines)

    return f"""
You are evaluating how meaningfully a user reflected on attending a real-world social event.

## Event attended
"{event_title}"

## Full reflection conversation
{history_block}

## Scoring criteria (0-10)
- 0-2: Barely engaged. One-word answers, no real reflection.
- 3-5: Some reflection. Mentioned what happened but surface level.
- 6-8: Good reflection. Shared feelings, what they noticed about themselves or others.
- 9-10: Deep reflection. Connected the experience to their social growth, fears overcome,
        or meaningful observations about connection.

## Rules
- Score based on the USER messages only, not the assistant.
- Do not inflate scores for short or shallow responses.
- summary: 1 sentence describing what the user reflected on (in English).

## Required JSON output (return ONLY this, no markdown)
{{
  "reflection_score": <integer 0-10>,
  "quality": "<minimal|surface|good|deep>",
  "summary": "<1 sentence English summary of their reflection>"
}}
""".strip()
