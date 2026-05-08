"""Схемы тарифов для API и валидации."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class TariffDiscountFields(BaseModel):
    discount_percent: int = Field(0, ge=0, le=100)
    discount_until: Optional[datetime] = None


class TariffCreateBody(BaseModel):
    name: str
    price: int = Field(..., ge=0)
    description: str = ""
    popular: bool = False
    features: List[str] = []
    bonuses: List[str] = []
    duration_days: int = Field(30, ge=1)
    trainings_count: int = Field(8, ge=0)
    discount_percent: int = Field(0, ge=0, le=100)
    discount_until: Optional[datetime] = None

