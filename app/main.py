import os

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, users, survey, missions, chat, matching, events, settings
from app.routers import stability, friends, ai

app = FastAPI(
    title="Social Companion API",
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,
        "docExpansion": "none",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/auth",      tags=["Auth"])
app.include_router(users.router,     prefix="/users",     tags=["Users"])
app.include_router(survey.router,    prefix="/survey",    tags=["Survey"])
app.include_router(missions.router,  prefix="/missions",  tags=["Missions"])
app.include_router(chat.router,      prefix="/chat",      tags=["Chat"])
app.include_router(matching.router,  prefix="/matching",  tags=["Matching"])
app.include_router(events.router,    prefix="/events",    tags=["Events"])
app.include_router(settings.router,  prefix="/settings",  tags=["Settings"])
app.include_router(stability.router, prefix="/stability", tags=["Stability"])
app.include_router(friends.router,   prefix="/friends",   tags=["Friends"])
app.include_router(ai.router,        prefix="/ai",        tags=["AI"])


@app.get("/")
def health_check():
    return {"message": "API is running", "db": "Firestore (do-test-925d3)"}


@app.get("/debug/auth")
def debug_auth(authorization: str = Header(None)):
    """Debug endpoint — shows what token the server receives (no auth required)."""
    return {
        "dev_mode": os.getenv("DEV_MODE", "false"),
        "has_auth_header": authorization is not None,
        "token_preview": (authorization[:50] + "...") if authorization and len(authorization) > 50 else authorization,
        "firebase_project": os.getenv("FIREBASE_PROJECT_ID", "not set"),
        "gemini_key_set": bool(os.getenv("GEMINI_API_KEY")),
    }
