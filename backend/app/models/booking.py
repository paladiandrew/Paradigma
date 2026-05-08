from beanie import Document
from datetime import datetime
from typing import Optional
from pydantic import Field


class Booking(Document):
    user_id: str
    training_id: str
    subscription_id: str
    status: str = "booked"
    booked_at: datetime = Field(default_factory=datetime.utcnow)
    cancelled_at: Optional[datetime] = None
    sub_profile_id: Optional[str] = None
    session_starts_at: Optional[datetime] = None

    class Settings:
        name = "bookings"

