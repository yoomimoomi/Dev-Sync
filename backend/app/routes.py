from fastapi import APIRouter
from .post_schemas import signup, pagepost, comments

db = []

router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)

@router.post("/signup")
async def create_user(user: signup):
    db.append(user)
    return {"message": "user recorded successfully"}

