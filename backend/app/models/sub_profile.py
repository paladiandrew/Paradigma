from beanie import Document
from datetime import datetime
from typing import Optional

from pydantic import Field


class SubProfile(Document):
    first_name: str
    last_name: str
    phone: str = ""
    parent_user_id: str
    birth_date: Optional[datetime] = None
    active_subscription_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "sub_profiles"

