from fastapi import APIRouter
from beanie.operators import And

from app.models.user import User

router = APIRouter()


@router.get("")
async def get_trainers():
    """Тренеры с галочкой «на главной» (профили пользователей role=trainer)."""
    q = await User.find(And(User.role == "trainer", User.show_on_homepage == True)).to_list()
    out = []
    for u in q:
        name = f"{u.first_name or ''} {u.last_name or ''}".strip() or (u.username or "Тренер")
        sessions = getattr(u, "conducted_sessions_count", None)
        out.append(
            {
                "id": str(u.id),
                "name": name,
                "specialty": u.specialty or "",
                "photo_url": u.avatar_url,
                "description": u.trainer_bio or "",
                "sessions_conducted": sessions if sessions is not None else None,
            }
        )
    return out
