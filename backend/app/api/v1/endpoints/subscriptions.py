from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from app.models.subscription import Subscription
from app.models.user import User
from app.api.v1.endpoints.users import get_current_user

router = APIRouter()

@router.get("/current")
async def get_current_subscription(current_user: User = Depends(get_current_user)):
    subscription = await Subscription.find_one(
        Subscription.user.id == current_user.id,
        Subscription.is_active == True
    )
    
    if not subscription:
        return None
    
    await subscription.fetch_all_links()
    
    return {
        "id": str(subscription.id),
        "tariff_name": subscription.tariff.name if subscription.tariff else None,
        "start_date": subscription.start_date.isoformat(),
        "end_date": subscription.end_date.isoformat(),
        "remaining_classes": subscription.remaining_classes,
        "total_classes": subscription.tariff.classes_per_month if subscription.tariff else None,
    }
