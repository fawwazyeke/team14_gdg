from fastapi import FastAPI

from app.routers import auth, users, survey, missions, chat, matching, events, settings

app = FastAPI(title="Social Companion API")

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(survey.router, prefix="/survey", tags=["Survey"])
app.include_router(missions.router, prefix="/missions", tags=["Missions"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(matching.router, prefix="/matching", tags=["Matching"])
app.include_router(events.router, prefix="/events", tags=["Events"])
app.include_router(settings.router, prefix="/settings", tags=["Settings"])


@app.get("/")
def health_check():
    return {"message": "API is running"}