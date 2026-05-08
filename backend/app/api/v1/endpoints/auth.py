import secrets
from datetime import timedelta
from typing import Optional

from beanie.operators import And
from fastapi import APIRouter, Depends, HTTPException, Response, status
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import LoginRequest, RegisterRequest, Token, UserResponse
from app.api.v1.endpoints.users import get_current_user
from app.core.log import log_event

router = APIRouter()


def _normalize_phone_ru(raw: str) -> str:
    s = raw.strip().replace("+", "").replace(" ", "")
    digits = "".join(c for c in s if c.isdigit())
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    elif len(digits) == 10 and digits.startswith("9"):
        digits = "7" + digits
    return digits


def _jwt_sub(user: User) -> str:
    if user.phone:
        return user.phone
    if user.username:
        return user.username
    if user.email:
        return user.email
    return str(user.id)


def _logins_equal(a: str, b: str) -> bool:
    a, b = a.strip(), b.strip()
    if "@" in b:
        return a.lower() == b.lower()
    return _normalize_phone_ru(a) == _normalize_phone_ru(b)


def _env_admin_credentials_configured() -> bool:
    if not settings.ADMIN_LOGIN or not str(settings.ADMIN_LOGIN).strip():
        return False
    return bool(settings.ADMIN_PASSWORD or settings.ADMIN_PASSWORD_HASH)


def _env_admin_password_ok(plain: str) -> bool:
    if settings.ADMIN_PASSWORD is not None and len(str(settings.ADMIN_PASSWORD)) > 0:
        pwd = str(settings.ADMIN_PASSWORD)
        if len(plain) != len(pwd):
            return False
        return secrets.compare_digest(plain, pwd)
    if settings.ADMIN_PASSWORD_HASH:
        return verify_password(plain, settings.ADMIN_PASSWORD_HASH)
    return False


async def _find_admin_user_for_env_login() -> Optional[User]:
    if not settings.ADMIN_LOGIN:
        return None
    env = settings.ADMIN_LOGIN.strip()
    if "@" in env:
        target = env.lower()
        user = await User.find_one(And(User.role == "admin", User.email == target))
        if user:
            return user
        for u in await User.find(User.role == "admin").to_list():
            if u.email and u.email.lower() == target:
                return u
        return None
    target_phone = _normalize_phone_ru(env)
    for u in await User.find(User.role == "admin").to_list():
        if _normalize_phone_ru(u.phone) == target_phone:
            return u
    return None


async def _find_user_by_login(raw: str) -> Optional[User]:
    login = raw.strip()
    if not login:
        return None
    u = await User.find_one(User.username == login.lower())
    if u:
        return u
    if "@" in login:
        return await User.find_one(User.email == login.lower())
    phone_norm = _normalize_phone_ru(login)
    if phone_norm:
        return await User.find_one(User.phone == phone_norm)
    return None


@router.post("/register", response_model=UserResponse)
async def register(request: RegisterRequest):
    existing_u = await User.find_one(User.username == request.username)
    if existing_u:
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует")
    if request.email:
        existing = await User.find_one(User.email == request.email)
        if existing:
            raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    phone_norm = ""
    if request.phone:
        phone_norm = _normalize_phone_ru(request.phone)
        existing_phone = await User.find_one(User.phone == phone_norm)
        if existing_phone:
            raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже существует")
    try:
        password_hash = get_password_hash(request.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    user = User(
        username=request.username,
        phone=phone_norm,
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        password_hash=password_hash,
        role="user",
        is_email_verified=False,
        is_phone_verified=False,
    )
    await user.insert()
    log_event("info", "/api/auth/register", "User registered", str(user.id), {"username": user.username, "email": user.email, "phone": user.phone})
    return user


@router.post("/login", response_model=Token)
async def login(request: LoginRequest, response: Response):
    if _env_admin_credentials_configured() and _logins_equal(request.login, settings.ADMIN_LOGIN or ""):
        if not _env_admin_password_ok(request.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
        user = await _find_admin_user_for_env_login()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Администратор не найден: в MongoDB нужен пользователь с role=admin и тем же email или телефоном, что в ADMIN_LOGIN",
            )
        access_token = create_access_token(
            {"sub": _jwt_sub(user), "user_id": str(user.id), "role": user.role},
            timedelta(days=365),
        )
        response.set_cookie("access_token", access_token, httponly=True, samesite="lax", max_age=365 * 24 * 60 * 60)
        log_event("info", "/api/auth/login", "Admin login via .env", str(user.id), {"email": user.email})
        return Token(access_token=access_token)

    user = await _find_user_by_login(request.login)
    if not user or not user.password_hash or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
    access_token = create_access_token({"sub": _jwt_sub(user), "user_id": str(user.id), "role": user.role}, timedelta(days=365))
    response.set_cookie("access_token", access_token, httponly=True, samesite="lax", max_age=365 * 24 * 60 * 60)
    log_event("info", "/api/auth/login", "Session created", str(user.id), {})
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}
