from beanie import Document
from datetime import datetime
from pydantic import Field
from typing import Optional

class Payment(Document):
    user_id: str
    tariff_id: str
    sub_profile_id: Optional[str] = None
    amount: int
    status: str = "pending"
    payment_method: str = "yookassa"
    payment_id: Optional[str] = None
    confirmation_url: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "payments"


