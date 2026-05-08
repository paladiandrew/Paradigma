from beanie import Document
from datetime import datetime
from typing import Optional
from pydantic import Field

class Trainer(Document):
    name: str
    specialty: str
    photo_url: Optional[str] = None
    description: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    class Settings:
        name = "trainers"


