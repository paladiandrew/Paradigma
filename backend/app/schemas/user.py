import re
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Optional, Union
from datetime import datetime
from bson import ObjectId

USERNAME_RE = re.compile(r"^[a-zA-Z0-9._-]{3,64}$")

BCRYPT_MAX_PASSWORD_BYTES = 72


def validate_bcrypt_password_bytes(v: str) -> str:
    if len(v.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
        raise ValueError("Пароль не должен превышать 72 байта (ограничение bcrypt)")
    return v


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=8)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, v) -> str:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            raise ValueError("Укажите логин")
        s = str(v).strip().lower()
        if not USERNAME_RE.match(s):
            raise ValueError("Логин: 3–64 символа, латиница, цифры и символы . _ -")
        return s

    @field_validator("phone", mode="before")
    @classmethod
    def empty_phone_to_none(cls, v) -> Optional[str]:
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        return str(v).strip()

    @field_validator("phone")
    @classmethod
    def phone_if_provided_min_len(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if len(v) < 10:
            raise ValueError("Телефон: минимум 10 символов или оставьте поле пустым")
        return v

    @field_validator("password")
    @classmethod
    def password_utf8_length(cls, v: str) -> str:
        return validate_bcrypt_password_bytes(v)

class LoginRequest(BaseModel):
    login: str
    password: str

class SendPhoneCodeRequest(BaseModel):
    phone: str

class VerifyPhoneCodeRequest(BaseModel):
    phone: str
    code: str

class SendEmailCodeRequest(BaseModel):
    email: EmailStr

class VerifyEmailCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)
    new_password_confirm: str

    @field_validator("new_password")
    @classmethod
    def new_password_utf8_length(cls, v: str) -> str:
        return validate_bcrypt_password_bytes(v)

class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    specialty: Optional[str] = None
    trainer_bio: Optional[str] = None
    show_on_homepage: Optional[bool] = None
    avatar_url: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: Optional[str] = None
    phone: str
    is_phone_verified: bool
    email: Optional[str] = None
    is_email_verified: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    specialty: Optional[str] = None
    trainer_bio: Optional[str] = None
    show_on_homepage: bool = False
    created_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def object_id_to_str(cls, v: Union[str, ObjectId]) -> str:
        if isinstance(v, ObjectId):
            return str(v)
        return v

class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"

class AdminLoginRequest(BaseModel):
    login: str
    password: str
