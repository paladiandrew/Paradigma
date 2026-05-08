from beanie import Document
from datetime import datetime
from typing import Optional
from pydantic import Field


class Event(Document):
    title: str
    description: str
    type: str  # promotion, news, event
    date: datetime
    end_date: Optional[datetime] = None
    image_url: Optional[str] = None
    linked_tariff_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "events"

