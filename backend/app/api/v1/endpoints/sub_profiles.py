from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.endpoints.users import get_current_user
from app.models.subscription import Subscription
from app.models.sub_profile import SubProfile
from app.models.user import User

router = APIRouter()


class SubProfileCreateBody(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    birth_date: Optional[datetime] = None


class SubProfileUpdateBody(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1)
    last_name: Optional[str] = Field(None, min_length=1)
    phone: Optional[str] = None
    birth_date: Optional[datetime] = None


class AssignSubscriptionBody(BaseModel):
    subscription_id: str


def _serialize(sp: SubProfile) -> dict:
    return {
        "id": str(sp.id),
        "first_name": sp.first_name,
        "last_name": sp.last_name,
        "phone": sp.phone or "",
        "parent_user_id": sp.parent_user_id,
        "birth_date": sp.birth_date.isoformat() if sp.birth_date else None,
        "active_subscription_id": sp.active_subscription_id,
        "created_at": sp.created_at.isoformat() if sp.created_at else None,
    }


@router.get("/me/sub-profiles")
async def list_my_sub_profiles(current_user: User = Depends(get_current_user)):
    q = await SubProfile.find(SubProfile.parent_user_id == str(current_user.id)).sort(SubProfile.created_at).to_list()
    return [_serialize(s) for s in q]


@router.post("/me/sub-profiles")
async def create_sub_profile(body: SubProfileCreateBody, current_user: User = Depends(get_current_user)):
    sp = SubProfile(
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        phone=(body.phone or "").strip(),
        parent_user_id=str(current_user.id),
        birth_date=body.birth_date,
    )
    await sp.insert()
    return _serialize(sp)


@router.put("/me/sub-profiles/{sub_id}")
async def update_sub_profile(sub_id: str, body: SubProfileUpdateBody, current_user: User = Depends(get_current_user)):
    sp = await SubProfile.get(sub_id)
    if not sp or sp.parent_user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Подпрофиль не найден")
    if body.first_name is not None:
        sp.first_name = body.first_name.strip()
    if body.last_name is not None:
        sp.last_name = body.last_name.strip()
    if body.phone is not None:
        sp.phone = body.phone.strip()
    if body.birth_date is not None:
        sp.birth_date = body.birth_date
    await sp.save()
    return _serialize(sp)


@router.delete("/me/sub-profiles/{sub_id}")
async def delete_sub_profile(sub_id: str, current_user: User = Depends(get_current_user)):
    sp = await SubProfile.get(sub_id)
    if not sp or sp.parent_user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Подпрофиль не найден")
    await sp.delete()
    return {"ok": True}


@router.post("/me/sub-profiles/{sub_id}/assign-subscription")
async def assign_subscription(sub_id: str, body: AssignSubscriptionBody, current_user: User = Depends(get_current_user)):
    sp = await SubProfile.get(sub_id)
    if not sp or sp.parent_user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Подпрофиль не найден")
    sub = await Subscription.get(body.subscription_id)
    if not sub or sub.user_id != str(current_user.id) or sub.status != "active":
        raise HTTPException(status_code=400, detail="Абонемент не найден или не активен")
    owned_by = getattr(sub, "sub_profile_id", None)
    if owned_by and owned_by != sub_id:
        raise HTTPException(status_code=400, detail="Этот абонемент оформлен на другого получателя")
    sp.active_subscription_id = body.subscription_id
    await sp.save()
    return _serialize(sp)
