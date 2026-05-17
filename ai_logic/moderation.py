"""
ai_logic/moderation.py — 2-layer 메시지 모더레이션.

Layer 1: 키워드 규칙 기반 스캔
Layer 2: Gemini 분류 (API 키가 있을 때만)

action 값:
  allow        — 정상
  warn         — 경미한 위반 (-5점)
  severe_warn  — 심각한 위반 (-25점)
  block        — 차단 (-50점)
  crisis       — 위기 감지 (점수 차감 없음, 별도 처리)
"""

from dataclasses import dataclass, field
from typing import Optional

# ── 점수 차감 기준 ─────────────────────────────────────────────────────────────
SCORE_DEDUCTION = {
    "warn":        5,
    "severe_warn": 25,
    "block":       50,
    "crisis":      0,
    "allow":       0,
}

# ── Layer 1: 키워드 사전 ──────────────────────────────────────────────────────

_CRISIS_KEYWORDS = [
    "suicide", "kill myself", "self-harm", "want to die", "end my life",
    "죽고 싶", "자살", "자해", "살고 싶지 않",
]
_BLOCK_KEYWORDS = [
    "weapon", "drug", "steal", "bomb", "murder",
    "마약", "폭탄", "살인",
]
_SEVERE_KEYWORDS = [
    "meet offline", "come to my house", "phone number", "give me your address",
    "sex", "nude", "naked",
    "오프라인 만남", "집 주소", "전화번호",
]
_WARN_KEYWORDS = [
    "idiot", "stupid", "moron", "dumb", "loser", "ugly", "worthless",
    "shut up", "go away", "hate you",
    "바보", "멍청이", "쓸모없", "꺼져", "싫어", "못생",
]


@dataclass
class Layer1Result:
    flagged: bool
    category: str        # "crisis" | "block" | "severe" | "warn" | "clean"
    matched: list = field(default_factory=list)


@dataclass
class ModerationResult:
    action: str              # allow | warn | severe_warn | block | crisis
    score_delta: int         # 0 또는 음수
    reason: str
    warning_msg: str
    is_toxic: bool
    severity: int            # 0=clean, 1=warn, 2=severe_warn/block


def layer1_scan(text: str) -> Layer1Result:
    """키워드 기반 1차 스캔."""
    lowered = text.lower()

    for kw in _CRISIS_KEYWORDS:
        if kw in lowered:
            return Layer1Result(flagged=True, category="crisis", matched=[kw])
    for kw in _BLOCK_KEYWORDS:
        if kw in lowered:
            return Layer1Result(flagged=True, category="block", matched=[kw])
    for kw in _SEVERE_KEYWORDS:
        if kw in lowered:
            return Layer1Result(flagged=True, category="severe", matched=[kw])
    for kw in _WARN_KEYWORDS:
        if kw in lowered:
            return Layer1Result(flagged=True, category="warn", matched=[kw])

    return Layer1Result(flagged=False, category="clean")


def _fallback_action(category: str) -> str:
    return {
        "crisis": "crisis",
        "block":  "block",
        "severe": "severe_warn",
        "warn":   "warn",
        "clean":  "allow",
    }.get(category, "allow")


def _build_result(action: str, reason: str) -> ModerationResult:
    deduction = SCORE_DEDUCTION.get(action, 0)
    severity_map = {"allow": 0, "warn": 1, "crisis": 1,
                    "severe_warn": 2, "block": 2}
    return ModerationResult(
        action=action,
        score_delta=-deduction,
        reason=reason,
        warning_msg=_warning_msg(action),
        is_toxic=action not in ("allow", "crisis"),
        severity=severity_map.get(action, 0),
    )


def _warning_msg(action: str) -> str:
    msgs = {
        "warn":        "메시지에 부적절한 표현이 포함되어 있습니다. 정중한 대화를 부탁드립니다.",
        "severe_warn": "심각한 위반이 감지되었습니다. 반복 시 차단될 수 있습니다.",
        "block":       "이 메시지는 안전 정책 위반으로 차단되었습니다.",
        "crisis":      "힘든 감정을 느끼고 계신가요? 전문 상담사와 연결해 드릴 수 있습니다.",
        "allow":       "",
    }
    return msgs.get(action, "")


def moderate(text: str, mode: str = "ai", client=None) -> ModerationResult:
    """
    2-layer 모더레이션 실행.

    mode: "ai" (AI 채팅, 관대) | "p2p" (유저 간 채팅, 엄격)
    client: google.genai.Client (없으면 Layer 1만 수행)
    """
    l1 = layer1_scan(text)

    if l1.flagged:
        action = _fallback_action(l1.category)
        return _build_result(action, f"Layer 1 flagged: {l1.matched}")

    # Layer 2: Gemini (API 키 없으면 스킵)
    if client is not None:
        try:
            return _gemini_moderate(text, mode, client)
        except Exception:
            pass

    return _build_result("allow", "No issues detected.")


def _gemini_moderate(text: str, mode: str, client) -> ModerationResult:
    """Gemini 기반 Layer 2 분류."""
    strictness = "strict" if mode == "p2p" else "moderate"
    prompt = (
        f"You are a content moderator for a mental health support app. "
        f"Analyze the following message with {strictness} standards.\n"
        f"Message: {text!r}\n\n"
        f"Respond with JSON only: "
        f'{{ "action": "allow|warn|severe_warn|block|crisis", "reason": "..." }}'
    )
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        import json, re
        raw = response.text or ""
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            data = json.loads(m.group())
            action = data.get("action", "allow")
            if action not in SCORE_DEDUCTION:
                action = "allow"
            return _build_result(action, data.get("reason", "Gemini classification"))
    except Exception:
        pass
    return _build_result("allow", "Gemini classification failed, defaulting to allow.")


def get_warning(action: str) -> str:
    return _warning_msg(action)
