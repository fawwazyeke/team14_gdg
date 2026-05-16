import json
import os
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def generate_json(prompt: str, system_instruction: Optional[str] = None) -> dict:
    if not GEMINI_API_KEY:
        print("Gemini API error: GEMINI_API_KEY is missing")
        return {}

    try:
        print(f"Using Gemini model: {GEMINI_MODEL}")
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=system_instruction,
        )
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return json.loads(response.text)
    except Exception as error:
        print(f"Gemini API error: {error}")
        return {}
