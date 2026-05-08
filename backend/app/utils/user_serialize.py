"""Сериализация User для API (стабильное поле id)."""

from app.models.user import User


def user_to_dict(u: User) -> dict:
    return {
        "id": str(u.id),
        "username": u.username,
        "phone": u.phone or "",
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "role": u.role,
        "is_phone_verified": u.is_phone_verified,
        "is_email_verified": u.is_email_verified,
        "active_subscription_id": u.active_subscription_id,
        "avatar_url": u.avatar_url,
        "specialty": u.specialty,
        "trainer_bio": u.trainer_bio,
        "show_on_homepage": u.show_on_homepage,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
    }
