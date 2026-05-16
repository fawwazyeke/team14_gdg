"""데이터베이스 레이어 — Firestore.

Firestore 컬렉션 구조:
  user_profiles/{uid}                          ← 유저 상태 (stability_score, stage 등)
  user_profiles/{uid}/onboarding_answers/{id}  ← 온보딩 답변
  user_profiles/{uid}/stability_logs/{id}      ← 점수 변화 로그
  user_profiles/{uid}/missions/{id}            ← 미션
  user_profiles/{uid}/mission_records/{id}     ← 미션 완료 기록

건드리지 않는 컬렉션 (다른 팀원 담당):
  users/{uid}    ← fawwaz 로그인/프로필
  events/{id}    ← fawwaz 이벤트 파이프라인
"""
from app.firebase import get_firestore

# 컬렉션 이름 상수
COL_USER_PROFILES = "user_profiles"
COL_ONBOARDING = "onboarding_answers"
COL_STABILITY_LOGS = "stability_logs"
COL_MISSIONS = "missions"
COL_MISSION_RECORDS = "mission_records"


def user_profiles_col():
    return get_firestore().collection(COL_USER_PROFILES)


def user_doc(uid: str):
    return user_profiles_col().document(uid)


def onboarding_col(uid: str):
    return user_doc(uid).collection(COL_ONBOARDING)


def stability_logs_col(uid: str):
    return user_doc(uid).collection(COL_STABILITY_LOGS)


def missions_col(uid: str):
    return user_doc(uid).collection(COL_MISSIONS)


def mission_records_col(uid: str):
    return user_doc(uid).collection(COL_MISSION_RECORDS)
