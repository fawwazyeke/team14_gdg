import json
import os
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client: Optional[genai.Client] = None


def _get_client() -> Optional[genai.Client]:
    global _client
    if _client is None and GEMINI_API_KEY:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def generate_text(prompt: str) -> str:
    client = _get_client()
    if not client:
        return ""
    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        return response.text.strip()
    except Exception as error:
        print(f"Gemini API error: {error}")
        return ""


def generate_json(prompt: str, system_instruction: Optional[str] = None) -> dict:
    client = _get_client()
    if not client:
        print("Gemini API error: GEMINI_API_KEY is missing")
        return {}

    try:
        print(f"Using Gemini model: {GEMINI_MODEL}")
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=system_instruction,
        )
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=config,
        )
        return json.loads(response.text)
    except Exception as error:
        print(f"Gemini API error: {error}")
        return {}
