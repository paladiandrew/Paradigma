from beanie import Document
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field


class Class(Document):
    """Занятие в расписании (повторяющееся или разовое)."""

    day_of_week: int = 0
    time: str = "10:00"
    duration: int = 60
    trainer_id: str = ""
    trainer_name: str = ""
    trainer_avatar: Optional[str] = None
    max_capacity: Optional[int] = None
    booked_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    title: str = ""
    category: str = "trainer"
    recurrence: str = "weekly"
    start_datetime: Optional[datetime] = None
    tariff_id: Optional[str] = None
    other_label: Optional[str] = None
    repeat_weeks: Optional[int] = None
    overrides: List[Dict[str, Any]] = Field(default_factory=list)

    class Settings:
        name = "trainings"

