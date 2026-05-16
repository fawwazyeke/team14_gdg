"""
stability_service.py — 점수 증가/감소/스트릭/페널티 통합 관리.

점수 변화 정책 (SCORE_DELTA, PENALTY_BASE in schemas.py):
  +0.5  AI와 대화 (ai_chat)
  +1.0  기본 미션 완료 (mission_complete)
  +1.5  AI 개인화 미션 완료 (ai_mission_complete)
  +5.0  사람과 대화 1인당 (user_chat_per_person)
  +4.0  친구 추가 (friend_added)
  +20.0 실제 모임 참석 (gathering_attend)

페널티 + 위반 메시지 저장:
  AI 거친 언행  → blocked_ai_messages (최상위 컬렉션)
  유저 채팅 위반 → blocked_chat_messages (기존 컬렉션, uid 필드 추가)
  점수 변동 기록 → user_profiles/{uid}/stability_logs (기존)
"""

import datetime
from datetime import date, timedelta
from typing import Optional, Tuple

from app.database import (
    blocked_ai_messages_col,
    blocked_chat_messages_col,
    stability_logs_col,
    user_doc,
)
from app.schemas import (
    AI_PENALTY_TRUST_THRESHOLD,
    PENALTY_BASE,
    SCORE_DELTA,
    score_to_stage,
)


# ── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

def _get_profile(uid: str) -> Tuple[dict, object]:
    """(data_dict, ref) 반환."""
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
        return streak, {}

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    streak = streak + 1 if last_date == yesterday else 1

    return streak, {"streak_count": streak, "last_activity_date": today}


def _write_stability_log(uid: str, delta: float, reason: str, score_after: float) -> None:
    """점수 변동 기록 — user_profiles/{uid}/stability_logs/{id}."""
    stability_logs_col(uid).add({
        "delta": delta,
        "score_after": score_after,
        "reason": reason,
        "created_at": datetime.datetime.utcnow(),
    })


def _save_ai_violation(
    uid: str,
    content: str,
    penalty_applied: float,
    ai_penalty_count: int,
    moderation: Optional[dict] = None,
) -> str:
    """
    AI 채팅 거친 언동 저장 → blocked_ai_messages (최상위 컬렉션).
    blocked_chat_messages와 동일한 형식, uid 추가.
    반환: 저장된 문서 ID
    """
    ref = blocked_ai_messages_col().document()
    ref.set({
        "uid": uid,
        "content": content,
        "moderation": moderation or {},
        "penalty_applied": penalty_applied,
        "ai_penalty_count": ai_penalty_count,   # 이번 위반 후 누적 횟수
        "created_at": datetime.datetime.utcnow(),
    })
    return ref.id


def _save_user_chat_violation(
    uid: str,
    content: str,
    room_id: Optional[str],
    action: str,           # "warned" | "penalized"
    penalty_applied: float,
    user_penalty_count: int,
    moderation: Optional[dict] = None,
) -> str:
    """
    유저 간 채팅 위반 저장 → blocked_chat_messages (기존 컬렉션).
    기존 matching_service.py 형식 유지 + uid / penalty 필드 추가.
    반환: 저장된 문서 ID
    """
    ref = blocked_chat_messages_col().document()
    ref.set({
        "uid": uid,                              # 성진 추가 (기존엔 user_id:int)
        "room_id": room_id,
        "content": content,
        "moderation": moderation or {},
        "action": action,                        # "warned" | "penalized"
        "penalty_applied": penalty_applied,
        "user_penalty_count": user_penalty_count,
        "created_at": datetime.datetime.utcnow(),
    })
    return ref.id


# ── 점수 증가 이벤트 ──────────────────────────────────────────────────────────

def apply_score_event(uid: str, event: str) -> dict:
    """
    점수 증가 이벤트 처리 + 스트릭 갱신 + stability_log 기록.

    event 종류:
      "ai_chat"              — AI와 대화 (+0.5)
      "mission_complete"     — 기본 미션 완료 (+1.0)
      "ai_mission_complete"  — AI 개인화 미션 완료 (+1.5)
      "user_chat_per_person" — 사람과 대화 1인당 (+5.0)
      "friend_added"         — 친구 추가 (+4.0)
      "gathering_attend"     — 실제 모임 참석 (+20.0)
    """
    delta = SCORE_DELTA.get(event, 0.0)
    data, ref = _get_profile(uid)

    new_score = round(float(data.get("stability_score", 0)) + delta, 2)
    stage = score_to_stage(new_score)
    streak, streak_updates = _update_streak(data)

    ref.update({"stability_score": new_score, "stage": stage, **streak_updates})
    _write_stability_log(uid, delta, f"score_event:{event}", new_score)

    return {
        "uid": uid,
        "event": event,
        "delta": delta,
        "stability_score": new_score,
        "stage": stage,
        "streak_count": streak,
    }


# ── 페널티 ────────────────────────────────────────────────────────────────────

def apply_penalty(
    uid: str,
    context: str,
    content: Optional[str] = None,   # 위반 메시지 원문
    room_id: Optional[str] = None,   # 유저 채팅 방 ID
    moderation: Optional[dict] = None,
) -> dict:
    """
    페널티 적용 + 위반 메시지 실제 DB 저장.

    context:
      "ai_chat"   — AI 대화 거친 언행
                    → blocked_ai_messages 저장 + stability_log
      "user_chat" — 실제 사람 대화 위반 (첫 1회 경고, 이후 -40 누적 가중)
                    → blocked_chat_messages 저장 + stability_log

    누적 가중치: base × (1 + 0.5 × 기존_위반_횟수)
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
    violation_doc_id = None

    if context == "ai_chat":
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
        # ── Firestore 저장 ──
        if content:
            violation_doc_id = _save_ai_violation(
                uid=uid,
                content=content,
                penalty_applied=delta,
                ai_penalty_count=new_ai_count,
                moderation=moderation,
            )
        _write_stability_log(uid, delta, f"penalty:ai_chat:{new_ai_count}", new_score)

    elif context == "user_chat":
        if not warning_given:
            action = "warned"
            delta = 0.0
            new_score = score
            stage = score_to_stage(score)
            new_user_count = user_count + 1
            updates = {
                "user_warning_given": True,
                "user_penalty_count": new_user_count,
            }
            message = (
                "실제 대화에서 부적절한 언행이 감지되었습니다. "
                "경고 1회입니다. 반복 시 점수가 차감됩니다."
            )
        else:
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

        # ── Firestore 저장 ──
        if content:
            violation_doc_id = _save_user_chat_violation(
                uid=uid,
                content=content,
                room_id=room_id,
                action=action,
                penalty_applied=delta,
                user_penalty_count=new_user_count,
                moderation=moderation,
            )
        _write_stability_log(
            uid, delta,
            f"penalty:user_chat:{action}:{new_user_count}",
            new_score if delta != 0 else score,
        )
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
        "violation_doc_id": violation_doc_id,
        "message": message,
    }


# ── 신뢰도 조회 ───────────────────────────────────────────────────────────────

def get_trust_profile(uid: str) -> dict:
    """is_trusted = ai_penalty_count < AI_PENALTY_TRUST_THRESHOLD."""
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


# ── ai_logic.moderation 연동 페널티 ──────────────────────────────────────────

def apply_moderation_penalty(
    uid: str,
    moderation_result: dict,
    context: str,
    content: str,
    room_id: str = None,
) -> dict:
    """
    ai_logic.moderation.moderate() 결과를 받아 점수 차감 + DB 저장.

    moderation_result: moderation_service.run_moderation() 반환값
      { action, score_delta(음수), reason, warning_msg, is_toxic, severity }

    context: "ai_chat" | "user_chat"

    점수 차감 기준 (ai_logic/moderation.py SCORE_DEDUCTION):
      warn        : -5
      severe_warn : -25
      block       : -50
      crisis/allow: 0

    기존 apply_penalty()와 달리 cumulative 가중 없음 — 모더레이션이 직접 결정.
    """
    action = moderation_result.get("action", "allow")
    score_delta = float(moderation_result.get("score_delta", 0))  # 이미 음수

    if action == "allow":
        return {
            "uid": uid, "context": context, "action": action,
            "delta": 0.0, "message": moderation_result.get("warning_msg", ""),
        }

    data, ref = _get_profile(uid)
    score = float(data.get("stability_score", 0))
    ai_count  = data.get("ai_penalty_count", 0)
    user_count = data.get("user_penalty_count", 0)

    new_score = round(score + score_delta, 2)
    stage = score_to_stage(new_score)

    # 카운트 증가 필드 결정
    if context == "ai_chat":
        count_update = {"ai_penalty_count": ai_count + 1}
    else:
        count_update = {"user_penalty_count": user_count + 1}

    updates = {"stability_score": new_score, "stage": stage, **count_update}

    # crisis는 점수 차감 없음, 카운트도 올리지 않음
    if action == "crisis":
        updates = {}
        new_score = score
        stage = score_to_stage(score)

    if updates:
        ref.update(updates)

    # Firestore 위반 로그 저장
    violation_doc_id = None
    if content and action != "allow":
        mod_dict = {
            "action": action,
            "score_delta": score_delta,
            "reason": moderation_result.get("reason", ""),
            "severity": moderation_result.get("severity", 0),
        }
        if context == "ai_chat":
            violation_doc_id = _save_ai_violation(
                uid=uid,
                content=content,
                penalty_applied=score_delta,
                ai_penalty_count=ai_count + 1,
                moderation=mod_dict,
            )
        else:
            violation_doc_id = _save_user_chat_violation(
                uid=uid,
                content=content,
                room_id=room_id,
                action=action,
                penalty_applied=score_delta,
                user_penalty_count=user_count + 1,
                moderation=mod_dict,
            )

    _write_stability_log(
        uid, score_delta,
        f"moderation:{context}:{action}",
        new_score,
    )

    final_data = ref.get().to_dict() or {}
    return {
        "uid":               uid,
        "context":           context,
        "action":            action,
        "delta":             score_delta,
        "stability_score":   final_data.get("stability_score", new_score),
        "stage":             final_data.get("stage", stage),
        "ai_penalty_count":  final_data.get("ai_penalty_count", ai_count),
        "user_penalty_count":final_data.get("user_penalty_count", user_count),
        "violation_doc_id":  violation_doc_id,
        "warning_msg":       moderation_result.get("warning_msg", ""),
        "message":           moderation_result.get("reason", ""),
    }
