from beanie import Document
from datetime import datetime
from typing import List, Optional
from pydantic import Field


class Tariff(Document):
    name: str
    price: int
    description: str = ""
    popular: bool = False
    features: List[str] = []
    bonuses: List[str] = []
    duration_days: int = 30
    trainings_count: int = 8
    discount_percent: int = Field(default=0, ge=0, le=100)
    discount_until: Optional[datetime] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Settings:
        name = "tariffs"

