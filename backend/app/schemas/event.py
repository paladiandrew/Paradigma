"""Схемы событий (акции, новости)."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventPromotionFields(BaseModel):
    linked_tariff_id: Optional[str] = None
