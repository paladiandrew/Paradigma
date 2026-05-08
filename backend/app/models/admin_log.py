from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class AdminLog(Document):
    admin_id: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "admin_logs"
