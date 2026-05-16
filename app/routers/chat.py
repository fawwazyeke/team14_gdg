from fastapi import APIRouter

router = APIRouter()


@router.post("/ai")
def chat_with_ai():
    return {"message": "AI chat endpoint"}