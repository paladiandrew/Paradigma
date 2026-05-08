"""
Одноразовое создание или обновление администратора в MongoDB.

Пример:
  cd backend
  .\\.venv\\Scripts\\python create_admin_user.py --email you@mail.com --password "YourStrongPassword"

Если пользователь с таким email уже есть — выставляются role=admin и новый пароль.
Если нет — создаётся учётка с уникальным техническим телефоном (только для входа через ADMIN_LOGIN в .env).

После этого в .env задайте ADMIN_LOGIN и ADMIN_PASSWORD (или ADMIN_PASSWORD_HASH), как в .env.example.
"""
from __future__ import annotations

import argparse
import asyncio
import random
import sys
from datetime import datetime

from app.core.database import close_mongo_connection, connect_to_mongo
from app.core.security import get_password_hash
from app.models.user import User


async def _unique_placeholder_phone() -> str:
    for _ in range(50):
        candidate = "79" + "".join(str(random.randint(0, 9)) for _ in range(9))
        if not await User.find_one(User.phone == candidate):
            return candidate
    raise RuntimeError("Не удалось подобрать свободный номер телефона")


async def run(email: str, password: str) -> None:
    email_norm = email.strip().lower()
    user = await User.find_one(User.email == email_norm)

    pwd_hash = get_password_hash(password)

    if user:
        user.role = "admin"
        user.password_hash = pwd_hash
        user.updated_at = datetime.utcnow()
        await user.save()
        print(f"OK: пользователь {email_norm} обновлён (role=admin, пароль сменён).")
        print(f"    id: {user.id}")
        return

    phone = await _unique_placeholder_phone()
    user = User(
        phone=phone,
        email=email_norm,
        first_name="Admin",
        last_name="",
        password_hash=pwd_hash,
        role="admin",
        is_email_verified=True,
        is_phone_verified=False,
    )
    await user.insert()
    print(f"OK: создан администратор {email_norm}, технический телефон в БД: {phone}")
    print(f"    id: {user.id}")
    print("    Вход на сайте: через email и пароль (или через ADMIN_LOGIN=этот email в .env).")


def main() -> None:
    p = argparse.ArgumentParser(description="Создать или обновить пользователя-админа")
    p.add_argument("--email", required=True, help="Email (как на /login)")
    p.add_argument("--password", required=True, help="Пароль")
    args = p.parse_args()

    async def _():
        await connect_to_mongo()
        try:
            await run(args.email, args.password)
        finally:
            await close_mongo_connection()

    asyncio.run(_())


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    main()
