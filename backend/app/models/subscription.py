from beanie import Document
from datetime import datetime
from pydantic import Field
from typing import Optional

class Subscription(Document):
    user_id: str
    tariff_id: str
    sub_profile_id: Optional[str] = None
    start_date: datetime
    end_date: datetime
    remaining_trainings: Optional[int] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "subscriptions"


