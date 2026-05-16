BAD_WORDS = ["badword1", "badword2"]
OFFLINE_MEETING_WORDS = ["meet offline", "come to my house", "phone number"]
CRIME_WORDS = ["weapon", "drug", "steal"]


def moderate_message(message: str) -> dict:
    lowered = message.lower()

    if any(word in lowered for word in CRIME_WORDS):
        return {
            "allowed": False,
            "reason": "crime_related_content",
            "message": "This message was blocked for safety.",
        }

    if any(word in lowered for word in OFFLINE_MEETING_WORDS):
        return {
            "allowed": True,
            "reason": "offline_meeting_warning",
            "message": "Please avoid sharing private contact or offline meeting details.",
        }

    if any(word in lowered for word in BAD_WORDS):
        return {
            "allowed": True,
            "reason": "bad_language_warning",
            "message": "Please keep the conversation respectful.",
        }

    return {
        "allowed": True,
        "reason": None,
        "message": None,
    }