from ai_logic.friend_matching import recommend_friends


def get_recommended_users(user_profile: dict, candidates: list[dict]) -> list[dict]:
    return recommend_friends(
        user_profile=user_profile,
        candidates=candidates,
        limit=5,
        min_score=0.4,
    )