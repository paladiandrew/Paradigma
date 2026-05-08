from datetime import datetime, timedelta
import base64
import uuid
import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.v1.endpoints.users import get_current_user
from app.core.database import get_mongo_client
from app.core.config import settings
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.sub_profile import SubProfile
from app.models.tariff import Tariff
from app.models.user import User
from app.core.log import log_event
from app.services.tariff_pricing import effective_price_rub

router = APIRouter()


class CreatePaymentPayload(BaseModel):
    tariff_id: str
    amount: float | None = None
    sub_profile_id: str | None = None


@router.post("/create-payment")
async def create_payment(payload: CreatePaymentPayload, current_user: User = Depends(get_current_user)):
    log_event("info", "/api/payments/create-payment", "Create payment requested", str(current_user.id), {"tariff_id": payload.tariff_id})
    tariff = await Tariff.get(payload.tariff_id)
    if not tariff:
        raise HTTPException(status_code=404, detail="Тариф не найден")

    sub_profile_id: str | None = None
    if payload.sub_profile_id:
        sp = await SubProfile.get(payload.sub_profile_id)
        if not sp or sp.parent_user_id != str(current_user.id):
            raise HTTPException(status_code=400, detail="Подпрофиль не найден")
        sub_profile_id = str(sp.id)

    base = effective_price_rub(tariff)
    amount = float(payload.amount) if payload.amount is not None else float(base)
    idem_key = str(uuid.uuid4())
    auth = base64.b64encode(f"{settings.YOOKASSA_SHOP_ID}:{settings.YOOKASSA_SECRET_KEY}".encode()).decode()
    request_body = {
        "amount": {"value": f"{amount:.2f}", "currency": "RUB"},
        "capture": True,
        "confirmation": {"type": "redirect", "return_url": settings.YOOKASSA_RETURN_URL},
        "description": f"Покупка тарифа {tariff.name}",
        "metadata": {
            "tariff_id": str(tariff.id),
            "user_id": str(current_user.id),
            **({"sub_profile_id": sub_profile_id} if sub_profile_id else {}),
        },
    }
    confirmation_url = ""
    yookassa_id = None
    status = "pending"
    if settings.YOOKASSA_SHOP_ID and settings.YOOKASSA_SECRET_KEY:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.yookassa.ru/v3/payments",
                headers={"Authorization": f"Basic {auth}", "Idempotence-Key": idem_key, "Content-Type": "application/json"},
                json=request_body,
            )
            data = response.json()
            yookassa_id = data.get("id")
            confirmation_url = data.get("confirmation", {}).get("confirmation_url", "")
            status = data.get("status", "pending")
    payment = Payment(
        user_id=str(current_user.id),
        tariff_id=str(tariff.id),
        sub_profile_id=sub_profile_id,
        amount=int(amount),
        status=status,
        payment_id=yookassa_id,
        confirmation_url=confirmation_url,
        metadata={"idempotence_key": idem_key},
    )
    await payment.insert()
    log_event("info", "/api/payments/create-payment", "Payment created", str(current_user.id), {"payment_id": str(payment.id), "yookassa_id": yookassa_id})
    return {"payment_id": str(payment.id), "confirmation_url": confirmation_url}


@router.post("/webhook")
async def payment_webhook(payload: dict):
    obj = payload.get("object", {})
    yookassa_id = obj.get("id")
    status = obj.get("status")
    if not yookassa_id:
        return {"ok": True}
    payment = await Payment.find_one(Payment.payment_id == yookassa_id)
    if not payment:
        log_event("warning", "/api/payments/webhook", "Unknown yookassa payment id", details={"yookassa_id": yookassa_id})
        return {"ok": True}
    if payment.status in {"succeeded", "canceled"}:
        log_event("info", "/api/payments/webhook", "Duplicate webhook ignored", payment.user_id, {"yookassa_id": yookassa_id, "status": payment.status})
        return {"ok": True}
    client = get_mongo_client()
    async with await client.start_session() as session:
        async with session.start_transaction():
            payment_col = Payment.get_motor_collection()
            sub_col = Subscription.get_motor_collection()
            user_col = User.get_motor_collection()
            sp_col = SubProfile.get_motor_collection()

            await payment_col.update_one({"_id": payment.id}, {"$set": {"status": status or "unknown"}}, session=session)
            if status != "succeeded":
                log_event("info", "/api/payments/webhook", "Payment status not succeeded", payment.user_id, {"status": status})
                return {"ok": True}

            sp_id = payment.sub_profile_id
            if sp_id:
                exists = await sub_col.find_one(
                    {
                        "user_id": payment.user_id,
                        "tariff_id": payment.tariff_id,
                        "status": "active",
                        "sub_profile_id": sp_id,
                    },
                    session=session,
                )
            else:
                exists = await sub_col.find_one(
                    {
                        "user_id": payment.user_id,
                        "tariff_id": payment.tariff_id,
                        "status": "active",
                        "$or": [{"sub_profile_id": None}, {"sub_profile_id": {"$exists": False}}],
                    },
                    session=session,
                )
            if exists:
                return {"ok": True}
            tariff = await Tariff.get(payment.tariff_id)
            if not tariff:
                return {"ok": True}
            start = datetime.utcnow()
            sub_doc = {
                "user_id": payment.user_id,
                "tariff_id": payment.tariff_id,
                "sub_profile_id": sp_id,
                "start_date": start,
                "end_date": start + timedelta(days=tariff.duration_days),
                "remaining_trainings": tariff.trainings_count,
                "status": "active",
                "created_at": start,
            }
            sub_res = await sub_col.insert_one(sub_doc, session=session)
            new_sub_id = str(sub_res.inserted_id)
            try:
                user_oid = ObjectId(payment.user_id)
            except Exception:
                user_oid = payment.user_id
            if sp_id:
                try:
                    sp_oid = ObjectId(sp_id)
                except Exception:
                    sp_oid = sp_id
                await sp_col.update_one({"_id": sp_oid}, {"$set": {"active_subscription_id": new_sub_id}}, session=session)
            else:
                await user_col.update_one({"_id": user_oid}, {"$set": {"active_subscription_id": new_sub_id}}, session=session)
            log_event("info", "/api/payments/webhook", "Subscription activated", payment.user_id, {"subscription_id": new_sub_id})
    return {"ok": True}
