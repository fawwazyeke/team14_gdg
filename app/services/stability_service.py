"""
stability_service.py — 점수 증가/감소/스트릭/페널티 통합 관리.

점수 변화 정책 (SCORE_DELTA, PENALTY_BASE in schemas.py):
  +0.5  AI와 대화 (ai_chat)
  +1.0  기본 미션 완료 (mission_complete)
  +1.5  AI 개인화 미션 완료 (ai_mission_complete)
  +5.0  사람과 대화 1인당 (user_chat_per_person)
  +4.0  친구 추가 (friend_added)
  +50.0 실제 모임 참석 (gathering_attend)

페널티:
  -0.1 × 가중치  AI 대화 거친 언행 (누적 가중)
  경고 → -40 × 가중치  실제 대화 위반 (첫 번째는 경고만)
"""

from datetime import date, timedelta
from typing import Tuple

from app.database import stability_logs_col, user_doc
from app.schemas import (
    AI_PENALTY_TRUST_THRESHOLD,
    PENALTY_BASE,
    SCORE_DELTA,
    score_to_stage,
)


# ── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

def _get_profile(uid: str) -> Tuple[dict, object]:
    """(data_dict, ref) 반환. 프로필 없으면 빈 dict."""
    ref = user_doc(uid)
    snap = ref.get()
    return (snap.to_dict() or {}, ref)


def _update_streak(data: dict) -> Tuple[int, dict]:
    """
    마지막 활동일을 기준으로 streak_count 계산.
    반환: (new_streak, fields_to_update)
    """
    today = date.today().isoformat()
    last_date = data.get("last_activity_date")
    streak = data.get("streak_count", 0)

    if last_date == today:
        return streak, {}                                   # 오늘 이미 처리됨

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    if last_date == yesterday:
        streak += 1                                         # 연속 달성
    else:
        streak = 1                                          # 스트릭 리셋

    return streak, {"streak_count": streak, "last_activity_date": today}


def _write_stability_log(uid: str, delta: float, reason: str) -> None:
    stability_logs_col(uid).add({
        "delta": delta,
        "reason": reason,
        "created_at": __import__("datetime").datetime.utcnow(),
    })


# ── 점수 증가 이벤트 ──────────────────────────────────────────────────────────

def apply_score_event(uid: str, event: str) -> dict:
    """
    점수 증가 이벤트 처리.

    event 종류:
      "ai_chat"              — AI와 대화
      "mission_complete"     — 기본 미션 완료
      "ai_mission_complete"  — AI 개인화 미션 완료
      "user_chat_per_person" — 사람과 대화 (1인당)
      "friend_added"         — 친구 추가
      "gathering_attend"     — 실제 모임 참석

    반환: ScoreEventResponse 호환 dict
    """
    delta = SCORE_DELTA.get(event, 0.0)
    data, ref = _get_profile(uid)

    new_score = round(float(data.get("stability_score", 0)) + delta, 2)
    stage = score_to_stage(new_score)
    streak, streak_updates = _update_streak(data)

    updates = {
        "stability_score": new_score,
        "stage": stage,
        **streak_updates,
    }
    ref.update(updates)
    _write_stability_log(uid, delta, f"score_event:{event}")

    return {
        "uid": uid,
        "event": event,
        "delta": delta,
        "stability_score": new_score,
        "stage": stage,
        "streak_count": streak,
    }


# ── 페널티 ────────────────────────────────────────────────────────────────────

def apply_penalty(uid: str, context: str) -> dict:
    """
    페널티 적용.

    context:
      "ai_chat"   — AI 대화 거친 언행 (-0.1, 누적 가중)
      "user_chat" — 실제 사람 대화 위반 (첫 1회 경고, 이후 -40 누적 가중)

    누적 가중치: penalty × (1 + 0.5 × 위반_횟수)
      → 위반 1회: -0.1, 2회: -0.15, 3회: -0.2 ... (ai_chat 예시)

    반환: PenaltyEventResponse 호환 dict
    """
    data, ref = _get_profile(uid)

    score = float(data.get("stability_score", 0))
    ai_count = data.get("ai_penalty_count", 0)
    user_count = data.get("user_penalty_count", 0)
    warning_given = data.get("user_warning_given", False)

    action = "penalized"
    delta = 0.0
    message = ""
    updates: dict = {}

    if context == "ai_chat":
        # 누적 가중 페널티
        multiplier = 1 + 0.5 * ai_count
        delta = -round(PENALTY_BASE["ai_chat_rough"] * multiplier, 3)
        new_score = round(score + delta, 2)
        new_ai_count = ai_count + 1
        stage = score_to_stage(new_score)

        updates = {
            "stability_score": new_score,
            "stage": stage,
            "ai_penalty_count": new_ai_count,
        }
        message = (
            f"AI 대화에서 거친 언행이 감지되었습니다. "
            f"(누적 {new_ai_count}회, -{abs(delta):.3f}점)"
        )
        _write_stability_log(uid, delta, f"penalty:ai_chat:{new_ai_count}")

    elif context == "user_chat":
        if not warning_given:
            # 첫 위반: 경고만, 점수 차감 없음
            action = "warned"
            delta = 0.0
            new_score = score
            stage = score_to_stage(score)
            updates = {
                "user_warning_given": True,
                "user_penalty_count": user_count + 1,
            }
            message = (
                "실제 대화에서 부적절한 언행이 감지되었습니다. "
                "경고 1회입니다. 반복 시 점수가 차감됩니다."
            )
            _write_stability_log(uid, 0.0, "penalty:user_chat:warning")
        else:
            # 재위반: 누적 가중 차감
            multiplier = 1 + 0.5 * user_count
            delta = -round(PENALTY_BASE["user_chat_violation"] * multiplier, 2)
            new_score = round(score + delta, 2)
            new_user_count = user_count + 1
            stage = score_to_stage(new_score)
            updates = {
                "stability_score": new_score,
                "stage": stage,
                "user_penalty_count": new_user_count,
            }
            message = (
                f"실제 대화에서 반복 위반이 적발되었습니다. "
                f"(누적 {new_user_count}회, -{abs(delta):.1f}점)"
            )
            _write_stability_log(uid, delta, f"penalty:user_chat:{new_user_count}")
        new_ai_count = ai_count

    else:
        raise ValueError(f"Unknown penalty context: {context}")

    ref.update(updates)
    final_data = ref.get().to_dict() or {}

    return {
        "uid": uid,
        "context": context,
        "action": action,
        "delta": delta,
        "stability_score": final_data.get("stability_score", score),
        "stage": final_data.get("stage", score_to_stage(score)),
        "ai_penalty_count": final_data.get("ai_penalty_count", ai_count),
        "user_penalty_count": final_data.get("user_penalty_count", user_count),
        "message": message,
    }


# ── 신뢰도 조회 ───────────────────────────────────────────────────────────────

def get_trust_profile(uid: str) -> dict:
    """
    유저가 실제 대화에서 타인에게 해를 끼칠 위험이 낮은지 여부.
    is_trusted = (ai_penalty_count < AI_PENALTY_TRUST_THRESHOLD)
    """
    data, _ = _get_profile(uid)
    ai_count = data.get("ai_penalty_count", 0)
    return {
        "uid": uid,
        "is_trusted": ai_count < AI_PENALTY_TRUST_THRESHOLD,
        "ai_penalty_count": ai_count,
        "user_penalty_count": data.get("user_penalty_count", 0),
        "user_warning_given": data.get("user_warning_given", False),
    }


# ── 스트릭 조회 ───────────────────────────────────────────────────────────────

def get_streak(uid: str) -> dict:
    data, _ = _get_profile(uid)
    return {
        "uid": uid,
        "streak_count": data.get("streak_count", 0),
        "last_activity_date": data.get("last_activity_date"),
    }
