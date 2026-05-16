"""
memory.py
Summary buffer memory for the companion chatbot.

오래된 대화는 Gemini로 요약해 압축하고, 최근 N턴은 그대로 유지한다.
요약본은 히스토리 앞에 컨텍스트로 주입되어 모델이 참고한다.
"""

from app.services.gemini_service import generate_text

RECENT_TURNS_KEEP = 6   # 최근 N턴은 원문 유지
SUMMARY_TRIGGER   = 10  # 총 턴 수가 이 값을 넘으면 압축 실행


class SummaryBufferMemory:
    """
    ConversationSummaryBufferMemory와 동일한 방식.
    - history: 최근 RECENT_TURNS_KEEP턴 (role/content 딕셔너리 리스트)
    - summary: 그 이전 대화를 압축한 요약 문자열
    """

    def __init__(self, history: list[dict] = None, summary: str = ""):
        self.history: list[dict] = history or []
        self.summary: str = summary

    def add_turn(self, user_message: str, assistant_reply: str) -> None:
        self.history.append({"role": "user", "content": user_message})
        self.history.append({"role": "assistant", "content": assistant_reply})
        self._maybe_compress()

    def get_history_for_prompt(self) -> list[dict]:
        """요약(있으면) + 최근 히스토리를 프롬프트용 리스트로 반환."""
        if not self.summary:
            return self.history

        return [
            {"role": "user", "content": f"[Context from earlier in our conversation: {self.summary}]"},
            {"role": "assistant", "content": "Got it, I'll keep that in mind."},
        ] + self.history

    def to_dict(self) -> dict:
        """Firestore 저장용 직렬화."""
        return {"history": self.history, "summary": self.summary}

    @classmethod
    def from_dict(cls, data: dict) -> "SummaryBufferMemory":
        """Firestore에서 불러온 데이터로 복원."""
        return cls(history=data.get("history", []), summary=data.get("summary", ""))

    def _maybe_compress(self) -> bool:
        if len(self.history) // 2 <= SUMMARY_TRIGGER:
            return False

        old_turns = self.history[:-RECENT_TURNS_KEEP * 2]
        self.history = self.history[-RECENT_TURNS_KEEP * 2:]

        new_summary = self._summarize(old_turns)
        self.summary = (self.summary + " " + new_summary).strip() if self.summary else new_summary
        return True

    def _summarize(self, turns: list[dict]) -> str:
        lines = []
        for t in turns:
            role = "User" if t["role"] == "user" else "Bot"
            lines.append(f"{role}: {t['content']}")

        prompt = (
            "Summarize the following conversation excerpt in 2-4 concise English sentences. "
            "Focus on what the user shared about themselves, their mood, and any topics discussed. "
            "Write in third person (e.g. 'The user mentioned...'). No bullet points.\n\n"
            + "\n".join(lines)
        )
        return generate_text(prompt)
