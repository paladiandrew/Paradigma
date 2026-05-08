from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    MONGO_URI: Optional[str] = None
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "paradigma_bjj"
    
    JWT_SECRET: Optional[str] = None
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    FRONTEND_URL: str = "http://localhost:5173"
    # localhost и 127.0.0.1 для браузера — разные Origin; в dev часто открывают Vite по IP.
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Вход в админку с /login: логин = email или телефон пользователя с role=admin в MongoDB
    ADMIN_LOGIN: Optional[str] = None
    # Пароль из .env: задайте ADMIN_PASSWORD **или** bcrypt-хеш в ADMIN_PASSWORD_HASH (через generate_admin_password.py)
    ADMIN_PASSWORD: Optional[str] = None
    ADMIN_PASSWORD_HASH: Optional[str] = None
    
    YOOKASSA_SHOP_ID: Optional[str] = None
    YOOKASSA_SECRET_KEY: Optional[str] = None
    YOOKASSA_RETURN_URL: str = "http://localhost:5173/tariffs"

    # Часовой пояс зала: для полей time / day_of_week и отображения в календаре (IANA, напр. Europe/Moscow)
    CLUB_TIMEZONE: str = "Europe/Moscow"
    
    class Config:
        env_file = ".env"

settings = Settings()

if settings.MONGO_URI:
    settings.MONGODB_URL = settings.MONGO_URI
if settings.JWT_SECRET:
    settings.SECRET_KEY = settings.JWT_SECRET
