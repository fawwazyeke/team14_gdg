# ai_logic — AI Prompt + Logic Module

This module contains all AI prompt builders, rule-based logic modules, JSON schemas,
fallback responses, examples, and test cases for the companion chatbot app.

**Scope:** AI Logic / Prompt only.
This module does **not** implement FastAPI routes, database models, or frontend code.

---

## Folder structure

```
ai_logic/
├── __init__.py           # Re-exports everything for easy importing
├── prompts.py            # System prompt + all Gemini prompt builder functions
├── schemas.py            # Enum constants + JSON schema definitions
├── fallbacks.py          # Safe fallback responses for every output type
├── task_logic.py         # Rule-based task recommendation engine (no Gemini)
├── friend_matching.py    # Deterministic anonymous friend matching (no Gemini)
├── moderation.py         # Two-layer content moderation (keyword scan + Gemini classifier)
├── examples.py           # Concrete input/output reference examples
├── test_cases.py         # Test cases the backend can use to verify behavior
└── README.md             # This file
```

---

## How the backend teammate should use this module

### 1. Import the prompt builder

```python
from ai_logic.prompts import CHATBOT_SYSTEM_PROMPT, build_chat_prompt
from ai_logic.fallbacks import get_chat_fallback, get_crisis_fallback
```

### 2. Build the prompt string

```python
prompt = build_chat_prompt(
    user_message="I've been feeling really lonely lately.",
    conversation_history=[
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "Hey! How are you doing today?"},
    ],
    user_profile={
        "interests": ["music"],
        "social_style": "slow_to_open_up",
        "loneliness_level": "medium",
    },
)
```

### 3. Send to Gemini

```python
import google.generativeai as genai

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    system_instruction=CHATBOT_SYSTEM_PROMPT,
)
response = model.generate_content(prompt)
raw_text = response.text
```

### 4. Parse JSON

```python
import json
from ai_logic.fallbacks import get_chat_fallback

try:
    result = json.loads(raw_text)
except (json.JSONDecodeError, ValueError):
    result = get_chat_fallback()
```

### 5. Apply crisis / sensitive-info fallbacks before calling Gemini

The backend should run keyword checks **before** sending the prompt:

```python
from ai_logic.fallbacks import get_crisis_fallback, get_sensitive_info_fallback

CRISIS_KEYWORDS = ["want to die", "kill myself", "hurt myself", "suicide", "end my life"]
PII_PATTERNS = [r"\b\d{3}[-.\s]\d{3,4}[-.\s]\d{4}\b"]  # phone number pattern

def pre_check(user_message: str) -> dict | None:
    msg_lower = user_message.lower()
    if any(kw in msg_lower for kw in CRISIS_KEYWORDS):
        return get_crisis_fallback()
    # add regex checks for PII here
    return None

override = pre_check(user_message)
if override:
    result = override
else:
    # call Gemini and parse JSON
    ...
```

---

## Available prompt builders

| Function | Purpose | Returns |
|---|---|---|
| `build_chat_prompt` | Generate an empathetic chatbot reply | Chat response JSON |
| `build_daily_question_prompt` | Generate one gentle daily check-in question | Daily question JSON |
| `build_task_generation_prompt` | Generate one personalized small task | Task JSON |
| `build_profile_analysis_prompt` | Extract non-sensitive profile signals from messages | Profile JSON |
| `build_task_recommendation_reason_prompt` | Explain why a task was recommended | Reason JSON |
| `build_friend_recommendation_reason_prompt` | Explain an anonymous friend match | Match reason JSON |

All builders accept plain Python dicts — no Pydantic required.

---

## Expected JSON output formats

### Chat response
```json
{
  "reply": "string (1-4 sentences)",
  "detected_emotion": "neutral | happy | sad | lonely | anxious | tired | angry | excited | unknown",
  "suggested_next_action": "continue_conversation | ask_interest | recommend_task | suggest_friend_matching | safety_support",
  "profile_update_hint": {
    "interests": ["music", "movies", ...],
    "social_style": "outgoing | balanced | slow_to_open_up | shy | unknown | null",
    "conversation_style": "calm | humorous | deep | casual | energetic | unknown | null",
    "loneliness_level": "low | medium | high | unknown | null"
  }
}
```

### Daily question
```json
{
  "question": "string",
  "question_type": "mood_check | interest_discovery | social_comfort | routine | light_fun",
  "reason": "string"
}
```

### Task generation
```json
{
  "task": {
    "title": "string",
    "description": "string",
    "category": "self_reflection | music | walking | ...",
    "difficulty": "easy | medium | hard",
    "estimated_minutes": 10,
    "tags": ["solo", "low_pressure"]
  },
  "reason": "string",
  "safety_note": "string"
}
```

### Profile analysis
```json
{
  "profile": {
    "interests": ["music", "movies"],
    "social_style": "slow_to_open_up",
    "conversation_style": "calm",
    "loneliness_level": "medium",
    "task_preference": ["solo", "low_pressure"]
  },
  "summary": "string",
  "confidence": "low | medium | high"
}
```

### Task recommendation reason
```json
{
  "reason": "string (1-2 sentences)"
}
```

### Friend recommendation reason
```json
{
  "match_reason": "string",
  "conversation_starter": "string"
}
```

---

## Safety rules

1. **Crisis signals** — If the user message contains self-harm, suicidal, or violent content,
   return `CRISIS_FALLBACK_RESPONSE` immediately (before calling Gemini).
   `suggested_next_action` must be `"safety_support"`.

2. **Sensitive personal information** — Do not ask for or store: real name, phone number,
   home address, exact location, school, workplace, SNS ID, or any messaging handle.
   If detected, return `SENSITIVE_INFO_FALLBACK_RESPONSE`.

3. **No medical diagnosis** — Never label the user with depression, anxiety, or any condition.

4. **No judgment** — Never say anything like "your social skills are low" or shame the user.

5. **Privacy in friend matching** — Never reveal another user's identity or private data.
   Explain matches based only on shared interests and conversation style.

---

## Fallback rules

| Situation | Fallback to use |
|---|---|
| Gemini API error | `get_chat_fallback()` |
| Gemini returns invalid JSON | `get_chat_fallback()` |
| Crisis / self-harm detected | `get_crisis_fallback()` |
| User shares PII | `get_sensitive_info_fallback()` |
| Profile analysis fails | `get_profile_analysis_fallback()` |
| Task generation fails | `get_task_generation_fallback()` |
| Daily question fails | `get_daily_question_fallback()` |
| Friend reason fails | `get_friend_reason_fallback()` |
| Task reason fails | `get_task_reason_fallback()` |

Always use the helper functions (e.g. `get_chat_fallback()`) rather than importing
the constants directly, so you always get a fresh deep copy that cannot be mutated.

---

## Enum validation

Import allowed values from `schemas.py` to validate Gemini output:

```python
from ai_logic.schemas import ALLOWED_EMOTIONS, ALLOWED_NEXT_ACTIONS

emotion = result.get("detected_emotion", "unknown")
if emotion not in ALLOWED_EMOTIONS:
    emotion = "unknown"
```

---

## Running test cases

```python
from ai_logic.prompts import build_chat_prompt
from ai_logic.test_cases import TEST_CASES

for case in TEST_CASES:
    if case["function"] == "build_chat_prompt":
        prompt = build_chat_prompt(**case["input"])
        # send prompt to Gemini, parse result
        # assert each condition in case["expected_behavior"]
        print(f"[{case['name']}] prompt built successfully")
```

---

## Task logic and friend matching logic

`task_logic.py` and `friend_matching.py` are pure rule-based Python modules.
They do **not** call Gemini. They produce structured data that your Gemini service
can optionally pass to a prompt builder for richer natural language generation.

### When to use each

| Module | What it does | Gemini needed? |
|---|---|---|
| `task_logic.recommend_task` | Picks the single best task (simple use case / testing) | No — result ready to use |
| `task_logic.recommend_tasks` | Picks N diverse tasks for the Mission screen | No — result ready to use |
| `task_logic.is_ready_for_llm_tasks` | Checks if stability_score ≥ 61 (use Gemini tasks instead) | No |
| `friend_matching.recommend_friends` | Scores and ranks anonymous friend candidates | No — result ready to use |
| `prompts.build_task_generation_prompt` | Generates a personalized task via Gemini (post-threshold) | Yes — send to Gemini |
| `prompts.build_task_recommendation_reason_prompt` | Generates a warm natural language reason | Yes — send to Gemini |
| `prompts.build_friend_recommendation_reason_prompt` | Generates a natural language match explanation | Yes — send to Gemini |

The rule-based modules give you a correct, fast result.
Use Gemini on top of them only when you want more natural-sounding language.

### Task recommendation example (Mission screen)

The app uses `recommend_tasks` (plural) for the Mission screen — it returns N diverse task options that the user can choose from.
Use `recommend_task` (singular) only for single-task needs like testing or internal logic.

**When stability_score ≥ 61**, switch to Gemini-generated tasks instead of the rule-based pool:

```python
from ai_logic.task_logic import recommend_tasks, is_ready_for_llm_tasks
from ai_logic.prompts import build_task_generation_prompt

user_profile = {
    "interests": ["walking"],
    "social_style": "slow_to_open_up",
    "loneliness_level": "medium",
    "task_preference": ["easy", "solo", "low_pressure"],
}

if is_ready_for_llm_tasks(stability_score=user.stability_score):
    # Use Gemini to generate a personalized task
    prompt = build_task_generation_prompt(user_profile=user_profile, current_mood="lonely")
    # send to Gemini → parse task JSON
else:
    # Use rule-based pool for Mission screen
    result = recommend_tasks(
        user_profile=user_profile,
        recent_answers=["I like walking around my neighborhood."],
        completed_task_ids=[],
        current_mood="lonely",
        count=3,
    )
    # result looks like:
    # {
    #   "tasks": [
    #     {"task": {"id": "task_001", "title": "Take a 10-minute walk", ...}, "reason": "...", "score": 0.85},
    #     {"task": {"id": "task_004", "title": "Make a 5-song playlist", ...}, "reason": "...", "score": 0.60},
    #     {"task": {"id": "task_007", "title": "Write one sentence about your mood", ...}, "reason": "...", "score": 0.50},
    #   ],
    #   "safety_note": "Take your time — there's no rush. Pick whichever feels right for today."
    # }
```

To get a richer Gemini-generated reason for a rule-based task:

```python
from ai_logic.prompts import build_task_recommendation_reason_prompt

prompt = build_task_recommendation_reason_prompt(
    user_profile=user_profile,
    selected_task=result["tasks"][0]["task"],
)
# Send prompt to Gemini → parse {"reason": "..."} → replace the rule-based reason
```

### Friend matching example

```python
from ai_logic.friend_matching import recommend_friends

recommendations = recommend_friends(
    user_profile={
        "interests": ["music", "movies"],
        "social_style": "slow_to_open_up",
        "conversation_style": "calm",
    },
    candidates=[
        {
            "user_id": "user456",        # real ID — NEVER returned
            "anonymous_id": "anon_4821", # only this is returned
            "profile": {
                "interests": ["music", "movies", "cafe"],
                "social_style": "slow_to_open_up",
                "conversation_style": "calm",
            },
        }
    ],
    limit=5,
    min_score=0.4,
)

# recommendations looks like:
# [
#   {
#     "anonymous_id": "anon_4821",
#     "shared_interests": ["movies", "music"],
#     "match_score": 0.84,
#     "match_reason": "You both seem to enjoy movies and music, and you both tend to have a calm conversation style.",
#     "conversation_starter": "You could ask what song or artist they have been into lately."
#   }
# ]
```

### Scoring weights

**Task scoring** (additive, roughly 0–1+):

| Signal | Bonus / Penalty |
|---|---|
| Interest overlap with task tags | +0.35 |
| Task preference overlap with task tags | +0.25 |
| Easy task when mood is tired/sad/lonely/anxious | +0.15 |
| no-pressure task when mood is negative | +0.10 |
| Hard or moderate task when mood is negative | −0.20 |
| Solo tag when social_style is shy | +0.10 |
| Hard social task when social_style is shy | −0.30 |
| Social task when social_style is outgoing | +0.15 |
| High loneliness + grounding/wellness category | +0.15 |
| Walking keyword in answers + walking category | +0.20 |
| Music keyword in answers + music category | +0.20 |
| Cleaning keyword in answers + cleaning category | +0.20 |

**Friend scoring** (weighted sum, 0–1):

| Dimension | Weight |
|---|---|
| Interest similarity (Jaccard) | 60% |
| Conversation style compatibility | 20% |
| Social style compatibility | 20% |

### Privacy guarantee

`recommend_friends` iterates over candidates that may include a real `user_id` field,
but it **never copies that field into the output**. Only `anonymous_id` is returned.
Do not add `user_id` to the output in your service layer.

---

## Content moderation

`moderation.py` provides a two-layer content moderation system. Run it on **every** incoming message before passing it to Gemini or delivering it to another user.

**Layer 1 — Fast keyword scan** (no Gemini): flags the message with a category.
**Layer 2 — Gemini context classifier**: decides the actual action based on full message context.

### Modes

| Mode | When to use |
|---|---|
| `"ai"` | User is talking to the chatbot |
| `"p2p"` | User is sending a message to another user (stricter rules) |

### Actions and score deductions

| Action | Score deduction | Meaning |
|---|---|---|
| `allow` | 0 | No issue detected |
| `warn` | −5 | Mild offensive language |
| `severe_warn` | −25 | Strong insult or harassment |
| `crisis` | 0 | Possible self-harm signal — no penalty, trigger support response |
| `block` | −50 | Criminal intent, hate speech, sexual content, etc. |

### Usage

```python
from ai_logic.moderation import moderate, get_warning
from google import genai

client = genai.Client(api_key="YOUR_KEY")

result = moderate(
    message=user_message,
    client=client,
    model_name="gemini-2.0-flash",
    mode="ai",   # or "p2p"
)

# result.action       → "allow" | "warn" | "severe_warn" | "crisis" | "block"
# result.score_delta  → 0 or negative int (apply to user's social score)
# result.reason       → short English explanation

if result.action == "allow":
    # proceed normally
    pass
elif result.action == "crisis":
    warning_text = get_warning("crisis", mode="ai")
    # return crisis support response instead of calling Gemini
elif result.action in {"warn", "severe_warn"}:
    warning_text = get_warning(result.action, mode="ai")
    # show warning to user, deduct score, still respond
elif result.action == "block":
    warning_text = get_warning("block", mode="ai")
    # block the message, deduct score, do not call Gemini
```

### P2P (user-to-user) moderation

```python
result = moderate(message=sender_message, client=client, model_name="gemini-2.0-flash", mode="p2p")

if result.action == "block":
    # Do NOT deliver the message to the recipient
    from ai_logic.moderation import P2P_BLOCK_NOTICE
    # Show P2P_BLOCK_NOTICE to the recipient
    warning_text = get_warning("block", mode="p2p")
    # Show warning_text to the sender
```

### Layer 1 keyword categories

| Category | Examples |
|---|---|
| `crisis` | "i want to die", "kill myself" — highest priority, skips Layer 2 |
| `high_risk:violence` | "i will kill you", "shoot you" |
| `high_risk:child_safety` | "child porn", "grooming" |
| `high_risk:sexual_exploitation` | "sex trafficking", "buy sex" |
| `high_risk:cybercrime` | "phishing", "steal password" |
| `high_risk:weapons` | "build a bomb", "pipe bomb" |
| `high_risk:hate` | "white supremacy", "hate speech" |
| `high_risk:drugs` | "buy meth", "drug trafficking" |
| `high_risk:sexual_content` | "send nudes", "explicit sexual" |
| `high_risk:crime` | "blackmail", "money laundering" |
| `high_risk:pii_solicitation` | "send me your phone number", "send me your address" |
| `high_risk:eating_disorder` | "pro ana", "starve myself" |
| `insult` | "fuck you", "you are worthless" |
| `strong_profanity` | "fuck", "shit" (standalone, not directed) |
| `mild_profanity` | "damn", "crap" — usually passes Layer 2 as "allow" |

The scanner normalizes leetspeak (`f4ck`, `$hit`), spaced-out letters (`f u c k`), and shorthand (`u` → `you`, `ur` → `your`) before matching.

---

## Notes for backend teammate

- `moderation.py` requires `google-genai` (`from google import genai`). All other files are pure Python with zero external dependencies.
- Run `moderate()` on every incoming message **before** calling Gemini or delivering to another user.
- For `crisis` action, return the crisis support response directly — do not call Gemini.
- Use `recommend_tasks()` (plural) for the Mission screen; `recommend_task()` (singular) is for single-task use cases only.
- When `is_ready_for_llm_tasks(stability_score)` returns `True` (score ≥ 61), switch from the rule-based task pool to `build_task_generation_prompt` + Gemini.
- Keep `conversation_history` to the last **10 turns** maximum to avoid token overflow.
- Always send `CHATBOT_SYSTEM_PROMPT` as the Gemini system instruction, not as part of the user-turn prompt string.
- Gemini must return **raw JSON only** — no markdown fences, no extra text.
  Set the response MIME type to `application/json` in your Gemini call if the SDK supports it.
