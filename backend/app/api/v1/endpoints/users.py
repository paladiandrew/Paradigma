from datetime import datetime

from beanie.operators import And, NE
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from app.core.security import decode_access_token, get_password_hash, verify_password
from app.models.sub_profile import SubProfile
from app.models.subscription import Subscription
from app.models.tariff import Tariff
from app.models.user import User
from app.schemas.user import USERNAME_RE, UserResponse, validate_bcrypt_password_bytes
from app.services.schedule_service import nearest_session_for_tariff

router = APIRouter()


class ChangePasswordPayload(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def new_password_utf8_length(cls, v: str) -> str:
        return validate_bcrypt_password_bytes(v)


async def get_current_user(request: Request, access_token: str = Cookie(None)) -> User:
    token = access_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Токен не предоставлен")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user_id = payload.get("user_id")
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    return current_user


async def get_trainer_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Доступ только для тренеров")
    return current_user


@router.get("/me/subscriptions")
async def my_subscriptions(current_user: User = Depends(get_current_user)):
    subs = await Subscription.find(
        And(Subscription.user_id == str(current_user.id), Subscription.status == "active")
    ).to_list()
    out = []
    for s in subs:
        tariff = await Tariff.get(s.tariff_id) if s.tariff_id else None
        nearest = None
        if s.tariff_id:
            nearest = await nearest_session_for_tariff(s.tariff_id)
        sp_id = getattr(s, "sub_profile_id", None)
        sub_profile = None
        if sp_id:
            sp = await SubProfile.get(sp_id)
            if sp and sp.parent_user_id == str(current_user.id):
                sub_profile = {
                    "id": str(sp.id),
                    "first_name": sp.first_name,
                    "last_name": sp.last_name,
                }
        out.append(
            {
                "subscription_id": str(s.id),
                "tariff_id": s.tariff_id,
                "sub_profile_id": sp_id,
                "sub_profile": sub_profile,
                "tariff": {"id": str(tariff.id), "name": tariff.name, "price": tariff.price} if tariff else None,
                "end_date": s.end_date.isoformat() if s.end_date else None,
                "remaining_trainings": s.remaining_trainings,
                "nearest_session": nearest,
            }
        )
    return out


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, _current_user: User = Depends(get_current_user)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


def _normalize_username(value: str | None) -> str | None:
    if value is None:
        return None
    s = str(value).strip().lower()
    if not s:
        return None
    if not USERNAME_RE.match(s):
        raise HTTPException(status_code=400, detail="Логин: 3–64 символа, латиница, цифры и символы . _ -")
    return s


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, payload: dict, current_user: User = Depends(get_current_user)):
    if str(current_user.id) != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if "username" in payload:
        new_u = _normalize_username(payload.get("username"))
        if new_u is None:
            raise HTTPException(status_code=400, detail="Логин не может быть пустым")
        taken = await User.find_one(And(User.username == new_u, NE(User.id, user.id)))
        if taken:
            raise HTTPException(status_code=400, detail="Этот логин уже занят")
        user.username = new_u
    for key in ["first_name", "last_name", "email", "phone", "active_subscription_id"]:
        if key in payload:
            setattr(user, key, payload[key])
    can_trainer_fields = current_user.role == "admin" or (
        str(current_user.id) == user_id and user.role == "trainer"
    )
    if can_trainer_fields:
        for key in ["specialty", "trainer_bio", "avatar_url"]:
            if key in payload:
                setattr(user, key, payload[key])
        if "show_on_homepage" in payload:
            user.show_on_homepage = bool(payload["show_on_homepage"])
    user.updated_at = datetime.utcnow()
    await user.save()
    return user


@router.post("/{user_id}/change-password")
async def change_password(user_id: str, payload: ChangePasswordPayload, current_user: User = Depends(get_current_user)):
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if not current_user.password_hash or not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Текущий пароль неверен")
    try:
        current_user.password_hash = get_password_hash(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    await current_user.save()
    return {"ok": True}
