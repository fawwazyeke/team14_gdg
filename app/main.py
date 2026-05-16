from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, users, survey, missions, chat, matching, events, settings
from app.routers import stability, friends

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

app.include_router(auth.router,     prefix="/auth",     tags=["Auth"])
app.include_router(users.router,    prefix="/users",    tags=["Users"])
app.include_router(survey.router,   prefix="/survey",   tags=["Survey"])
app.include_router(missions.router, prefix="/missions", tags=["Missions"])
app.include_router(chat.router,     prefix="/chat",     tags=["Chat"])
app.include_router(matching.router, prefix="/matching", tags=["Matching"])
app.include_router(events.router,   prefix="/events",   tags=["Events"])
app.include_router(settings.router,  prefix="/settings",  tags=["Settings"])
app.include_router(stability.router, prefix="/stability", tags=["Stability"])
app.include_router(friends.router,   prefix="/friends",   tags=["Friends"])


@app.get("/")
def health_check():
    return {"message": "API is running", "db": "Firestore (do-test-925d3)"}
