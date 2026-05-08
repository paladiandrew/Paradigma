from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ClassCreatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = ""
    category: str = "trainer"
    recurrence: str = "weekly"
    day_of_week: int = Field(0, ge=0, le=6)
    time: str = "10:00"
    duration: int = Field(60, ge=1)
    start_datetime: Optional[datetime] = None
    trainer_id: Optional[str] = None
    tariff_id: Optional[str] = None
    max_capacity: Optional[int] = Field(default=None)
    other_label: Optional[str] = None
    repeat_weeks: Optional[int] = Field(default=None)

    @field_validator("max_capacity")
    @classmethod
    def max_capacity_ok(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v < 1:
            raise ValueError("Укажите положительное число мест или оставьте пустым")
        return v

    @field_validator("repeat_weeks")
    @classmethod
    def repeat_weeks_ok(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v < 1 or v > 100:
            raise ValueError("Количество повторений от 1 до 100 или без ограничения")
        return v


class ClassUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = None
    category: Optional[str] = None
    recurrence: Optional[str] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    time: Optional[str] = None
    duration: Optional[int] = Field(None, ge=1)
    start_datetime: Optional[datetime] = None
    trainer_id: Optional[str] = None
    tariff_id: Optional[str] = None
    max_capacity: Optional[int] = Field(default=None)
    other_label: Optional[str] = None
    repeat_weeks: Optional[int] = Field(default=None)
    trainer_name: Optional[str] = None
    trainer_avatar: Optional[str] = None
    booked_count: Optional[int] = None
    overrides: Optional[List[Dict[str, Any]]] = None

    @field_validator("max_capacity")
    @classmethod
    def max_capacity_ok_update(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v < 1:
            raise ValueError("Укажите положительное число мест или оставьте пустым")
        return v

    @field_validator("repeat_weeks")
    @classmethod
    def repeat_weeks_ok_update(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v < 1 or v > 100:
            raise ValueError("Количество повторений от 1 до 100 или без ограничения")
        return v
