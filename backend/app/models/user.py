from beanie import Document
from datetime import datetime
from typing import Optional
from pydantic import Field

class User(Document):
    username: Optional[str] = None  # уникальный логин (нижний регистр); вход также по email или телефону
    phone: str = ""
    is_phone_verified: bool = False
    phone_verification_code: Optional[str] = None
    phone_verification_code_expires: Optional[datetime] = None
    email: Optional[str] = None
    is_email_verified: bool = False
    email_verification_code: Optional[str] = None
    email_verification_code_expires: Optional[datetime] = None
    password_hash: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "user"
    is_blocked: bool = False
    active_subscription_id: Optional[str] = None
    avatar_url: Optional[str] = None
    # Поля профиля тренера (role == "trainer")
    specialty: Optional[str] = None
    trainer_bio: Optional[str] = None
    conducted_sessions_count: Optional[int] = None
    show_on_homepage: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"


