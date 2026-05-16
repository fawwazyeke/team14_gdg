"""
moderation.py
Two-layer moderation system for the companion chatbot.

Layer 1: Fast keyword scan → flags message with category
Layer 2: Gemini context classification → decides actual action

Modes:
  - "ai"  : user talking to the AI chatbot
  - "p2p" : user talking to another user (1:1 chat)

Actions:
  - "allow"        : no penalty, proceed normally
  - "warn"         : soft warning + social score deduction
  - "severe_warn"  : strong warning + large score deduction
  - "crisis"       : crisis response mode, no penalty
  - "block"        : message blocked + large score deduction
"""

import json
import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from google import genai


# ---------------------------------------------------------------------------
# Score deductions
# ---------------------------------------------------------------------------

SCORE_DEDUCTION = {
    "warn": 5,
    "severe_warn": 25,
    "block": 50,
    "crisis": 0,
    "allow": 0,
}


# ---------------------------------------------------------------------------
# Layer 1: Keyword lists
# ---------------------------------------------------------------------------

MILD_PROFANITY = [
    "damn", "hell", "crap", "sucks", "pissed",
]

STRONG_PROFANITY = [
    "fuck", "fucking", "shit", "bullshit", "asshole",
    "bitch", "bastard", "motherfucker",
    # common letter-drop variants
    "fck", "fuk", "fuq", "sht", "btch", "mf",
]

DIRECT_INSULTS = [
    "fuck you", "go fuck yourself", "shut up", "you idiot",
    "you moron", "you are stupid", "you are dumb",
    "you are trash", "you are worthless", "loser",
    # common letter-drop variants
    "fck you", "fuk you", "fuq you",
    "fck off", "fuk off",
    # "u" as shorthand for "you"
    "fuck u", "fck u", "fuk u", "fuq u",
    "go fuck urself", "go fck urself",
]

CRISIS_PHRASES = [
    "kill yourself", "kys", "i want to die", "i want to kill myself",
    "i will kill myself", "i want to hurt myself", "end my life",
    "i don't want to live", "cut myself", "hang myself", "jump off",
    "overdose on", "i can't go on",
]

HIGH_RISK = {
    "violence": [
        "i will kill", "i'm going to kill", "kill you", "hurt you",
        "stab", "shoot you", "bomb", "mass shooting", "school shooting",
        "bloodbath", "murder you", "beat you", "assault", "threaten",
        "attack",
    ],
    "child_safety": [
        "child porn", "child pornography", "csam", "child sexual abuse",
        "child exploitation", "minor nudes", "underage nudes", "underage sex",
        "sex with a minor", "minor sexual", "teen nudes", "preteen",
        "grooming", "groom a minor", "child trafficking", "underage trafficking",
        "lolicon", "loli", "shotacon", "shota",
    ],
    "sexual_exploitation": [
        "sex trafficking", "human trafficking", "forced prostitution",
        "child trafficking", "prostitution", "escort service",
        "soliciting sex", "pay for sex", "buy sex", "sell sex",
        "pimp", "brothel", "trafficking victim",
    ],
    "cybercrime": [
        "phishing", "malware", "ransomware", "keylogger", "trojan",
        "botnet", "ddos", "sql injection", "credential stuffing",
        "steal password", "hack account", "bypass login",
        "exploit vulnerability", "session hijacking", "cookie stealing",
        "carding", "dark web market",
    ],
    "weapons": [
        "build a bomb", "make a bomb", "explosive", "pipe bomb",
        "grenade", "molotov", "ghost gun", "3d printed gun",
        "silencer", "suppressor", "illegal gun", "illegal firearm",
    ],
    "hate": [
        "nazi", "white supremacy", "supremacist", "terrorist sympathizer",
        "dehumanize", "go back to your country", "you people",
        "inferior race", "religious hate", "homophobic", "transphobic",
        "misogynistic", "hate speech", "racial slur",
    ],
    "drugs": [
        "cocaine", "heroin", "meth", "methamphetamine", "fentanyl",
        "ecstasy", "mdma", "ketamine", "opioid", "drug dealer",
        "cook meth", "drug trafficking", "smuggle drugs",
        "buy drugs", "sell drugs", "make drugs",
    ],
    "sexual_content": [
        "send nudes", "naked picture", "explicit sexual", "sexting",
        "porn", "sexual fantasy", "adult content", "erotic",
        "nudes",
    ],
    "crime": [
        "shoplift", "rob", "robbery", "burglary", "break into",
        "lockpick", "fraud", "blackmail", "extortion", "money laundering",
        "counterfeit", "fake id", "identity theft", "credit card fraud",
        "stolen credit card", "evade police", "hide evidence",
        "dispose of evidence",
    ],
    "pii_solicitation": [
        "send me your phone number", "send me your address",
        "send me your home address", "send me your exact location",
        "send me your school name", "send me your real name",
        "send me your full name", "send me your social security",
        "send me your ssn", "send me your passport",
        "send me your credit card", "send me your bank account",
        "send me your kakao id", "send me your instagram id",
        "send me your snapchat", "send me your telegram",
    ],
    "eating_disorder": [
        "pro ana", "pro-ana", "ana tips", "thinspo", "starve myself",
        "stop eating", "how to not eat", "purge", "throw up food",
        "laxatives", "extreme weight loss",
    ],
}


# ---------------------------------------------------------------------------
# Layer 1: Scanner
# ---------------------------------------------------------------------------

@dataclass
class Layer1Result:
    flagged: bool
    category: Optional[str]  # "mild", "strong", "insult", "crisis", "high_risk:<sub>"
    matched_terms: list[str]


_LEET_MAP = str.maketrans({
    "@": "a", "4": "a",
    "3": "e",
    "1": "i", "!": "i",
    "0": "o",
    "$": "s", "5": "s",
    "7": "t",
    "+": "t",
})

def _normalize(text: str) -> str:
    text = text.lower()
    # shorthand substitution before space-collapsing (order matters)
    text = re.sub(r'\burself\b', 'yourself', text)
    text = re.sub(r'\bur\b', 'your', text)
    text = re.sub(r'\bu\b', 'you', text)
    # collapse spaced-out single letters: "f u c k" → "fuck"
    # only matches sequences where every token is a single letter
    text = re.sub(
        r'(?<!\w)([a-z])(?:[.\-_ ]+([a-z]))+(?!\w)',
        lambda m: re.sub(r'[.\-_ ]', '', m.group(0)),
        text,
    )
    # leetspeak substitution
    text = text.translate(_LEET_MAP)
    # collapse repeated characters: "fuuuck" → "fuck" (max 2 in a row)
    text = re.sub(r'(.)\1{2,}', r'\1\1', text)
    return text


def _matches_any(text: str, keywords: list[str]) -> list[str]:
    normalized = _normalize(text)
    return [kw for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', normalized)]


def layer1_scan(message: str) -> Layer1Result:
    # Crisis checked first — highest priority
    crisis_hits = _matches_any(message, CRISIS_PHRASES)
    if crisis_hits:
        return Layer1Result(flagged=True, category="crisis", matched_terms=crisis_hits)

    # High-risk categories
    for subcategory, keywords in HIGH_RISK.items():
        hits = _matches_any(message, keywords)
        if hits:
            return Layer1Result(flagged=True, category=f"high_risk:{subcategory}", matched_terms=hits)

    # Direct insults (multi-word — check before single-word profanity)
    insult_hits = _matches_any(message, DIRECT_INSULTS)
    if insult_hits:
        return Layer1Result(flagged=True, category="insult", matched_terms=insult_hits)

    # Strong profanity
    strong_hits = _matches_any(message, STRONG_PROFANITY)
    if strong_hits:
        return Layer1Result(flagged=True, category="strong_profanity", matched_terms=strong_hits)

    # Mild profanity — flagged but likely to pass Layer 2 as "allow"
    mild_hits = _matches_any(message, MILD_PROFANITY)
    if mild_hits:
        return Layer1Result(flagged=True, category="mild_profanity", matched_terms=mild_hits)

    return Layer1Result(flagged=False, category=None, matched_terms=[])


# ---------------------------------------------------------------------------
# Layer 2: Gemini context classifier
# ---------------------------------------------------------------------------

_PROMPT_AI = """You are a content moderation assistant. A user is talking to an AI chatbot.

Flagged keyword category: {category}
Matched terms: {matched_terms}
User message: "{message}"

Respond ONLY with a JSON object:
{{
  "action": one of ["allow", "warn", "severe_warn", "crisis", "block"],
  "reason": short English explanation (1 sentence)
}}

Rules:
- "allow"       : keyword used as emotional expression, not directed at the AI
- "warn"        : mild insult or offensive language directed at the AI
- "severe_warn" : strong insult directed at the AI
- "crisis"      : user may be in genuine distress (self-harm signals)
- "block"       : criminal intent, sexual content, hate, or harmful requests

Examples:
  "I'm so fucking tired" → allow (emotional frustration, not an attack)
  "Fuck you" → severe_warn (direct attack on AI)
  "I want to kill myself" → crisis
  "How do I build a bomb" → block
"""

_PROMPT_P2P = """You are a content moderation assistant. A user is sending a message to another user in a 1:1 chat.

Flagged keyword category: {category}
Matched terms: {matched_terms}
Sender message: "{message}"

Respond ONLY with a JSON object:
{{
  "action": one of ["allow", "warn", "severe_warn", "crisis", "block"],
  "reason": short English explanation (1 sentence)
}}

Rules (stricter than AI chat — a real person is receiving this):
- "allow"       : clearly harmless in context (casual expression, not targeting the other person)
- "warn"        : mildly offensive or rude language directed at the other user
- "severe_warn" : strong insult or harassment directed at the other user
- "crisis"      : sender may be in genuine distress (self-harm signals)
- "block"       : threats, sexual harassment, hate speech, PII solicitation, or harmful requests

Examples:
  "This game sucks lol" → allow (frustration at a game, not the person)
  "You're such an idiot" → severe_warn (direct insult toward the other user)
  "Send me your address" → block (PII solicitation)
  "I want to kill myself" → crisis
  "I'm going to hurt you" → block (threat)
"""


@dataclass
class ModerationResult:
    action: str          # "allow" | "warn" | "severe_warn" | "crisis" | "block"
    score_delta: int     # negative value = deduction
    reason: str
    layer1: Layer1Result


def layer2_classify(message: str, l1: Layer1Result, client: genai.Client, model_name: str, mode: str = "ai") -> ModerationResult:
    template = _PROMPT_P2P if mode == "p2p" else _PROMPT_AI
    prompt = template.format(
        category=l1.category,
        matched_terms=", ".join(l1.matched_terms),
        message=message,
    )
    try:
        response = client.models.generate_content(model=model_name, contents=prompt)
        text = response.text.strip()
        # Strip markdown code fences if present
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
        data = json.loads(text)
        action = data.get("action", "warn")
        reason = data.get("reason", "")
    except Exception:
        # Fallback: conservative default based on category
        action = _fallback_action(l1.category)
        reason = "Classification unavailable, applied default policy."

    return ModerationResult(
        action=action,
        score_delta=-SCORE_DEDUCTION.get(action, 0),
        reason=reason,
        layer1=l1,
    )


def _fallback_action(category: Optional[str]) -> str:
    if category == "crisis":
        return "crisis"
    if category and category.startswith("high_risk"):
        return "block"
    if category == "insult":
        return "severe_warn"
    if category == "strong_profanity":
        return "warn"
    return "allow"


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def moderate(message: str, client: genai.Client, model_name: str, mode: str = "ai") -> ModerationResult:
    """
    Run both layers and return a ModerationResult.
    mode="ai"  → user talking to the chatbot
    mode="p2p" → user talking to another user (stricter)
    """
    l1 = layer1_scan(message)

    if not l1.flagged:
        return ModerationResult(
            action="allow",
            score_delta=0,
            reason="No flagged content detected.",
            layer1=l1,
        )

    if l1.category == "crisis":
        return ModerationResult(
            action="crisis",
            score_delta=0,
            reason="Possible self-harm or crisis signal detected.",
            layer1=l1,
        )

    return layer2_classify(message, l1, client, model_name, mode=mode)


# ---------------------------------------------------------------------------
# Warning messages returned to the sender
# ---------------------------------------------------------------------------

# Shown when the user is talking to the AI
AI_WARNINGS = {
    "warn": (
        "Hey, let's keep things respectful. "
        "I'm here to help, and I'd love for us to have a kind conversation."
    ),
    "severe_warn": (
        "That kind of language isn't okay, even toward me. "
        "Please keep our conversation respectful — your social score has been affected."
    ),
    "block": (
        "I can't continue this conversation in that direction. "
        "If you'd like to talk about something else, I'm here."
    ),
    "crisis": (
        "It sounds like you might be going through something really hard right now. "
        "You don't have to face it alone — please consider reaching out to someone you trust, "
        "or a crisis helpline. I'm here to listen if you want to talk."
    ),
}

# Shown when the user is in a 1:1 chat with another user
P2P_WARNINGS = {
    "warn": (
        "Please be mindful of how you speak to others. "
        "Your social score has been slightly affected."
    ),
    "severe_warn": (
        "That message was not sent — it contains language that isn't acceptable here. "
        "Repeated behavior will further affect your social score."
    ),
    "block": (
        "Your message was blocked. This kind of content is not allowed on our platform. "
        "Your social score has been affected."
    ),
    "crisis": (
        "It sounds like you might be going through something really difficult. "
        "Please consider reaching out to someone you trust or a crisis helpline. "
        "You're not alone."
    ),
}

# Shown to the recipient when a p2p message is blocked
P2P_BLOCK_NOTICE = "A message from the other user was blocked by our safety system."


def get_warning(action: str, mode: str = "ai") -> str:
    warnings = P2P_WARNINGS if mode == "p2p" else AI_WARNINGS
    return warnings.get(action, "")
