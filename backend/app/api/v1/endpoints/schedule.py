from datetime import date, datetime, timedelta

from beanie.operators import And
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.v1.endpoints.users import get_current_user
from app.core.database import get_mongo_client
from app.core.log import log_event
from app.models.booking import Booking
from app.models.class_model import Class
from app.models.sub_profile import SubProfile
from app.models.subscription import Subscription
from app.models.tariff import Tariff
from app.models.user import User
from app.services.class_schedule_payload import isoformat_utc_stored_naive
from app.services.schedule_service import (
    display_title_for_class,
    expand_instances_in_range,
    format_class_datetime_in_api,
    next_occurrence_after,
)
from app.services.tariff_pricing import discount_is_active, effective_price_rub

router = APIRouter()


class BookPayload(BaseModel):
    trainingId: str
    subscriptionId: str | None = None
    sub_profile_id: str | None = None
    sessionStartsAt: str | None = None


def _parse_session_at(raw: str | None) -> datetime | None:
    if not raw or not str(raw).strip():
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректная дата занятия")


async def _serialize_training(t: Class) -> dict:
    tariff = None
    if t.tariff_id:
        doc = await Tariff.get(t.tariff_id)
        if doc:
            tariff = {
                "id": str(doc.id),
                "name": doc.name,
                "price": doc.price,
                "description": doc.description,
                "discount_percent": getattr(doc, "discount_percent", 0) or 0,
                "discount_until": doc.discount_until.isoformat() if getattr(doc, "discount_until", None) else None,
                "effective_price": effective_price_rub(doc),
                "discount_active": discount_is_active(doc),
            }
    now = datetime.utcnow()
    nxt = next_occurrence_after(t, now)
    return {
        "id": str(t.id),
        "day_of_week": t.day_of_week,
        "start_time": t.time,
        "duration": t.duration,
        "title": display_title_for_class(t),
        "category": t.category,
        "recurrence": t.recurrence,
        "start_datetime": isoformat_utc_stored_naive(t.start_datetime),
        "trainer": {
            "id": t.trainer_id,
            "name": t.trainer_name,
            "avatar": t.trainer_avatar,
        },
        "other_label": t.other_label,
        "max_capacity": t.max_capacity,
        "booked_count": t.booked_count,
        "tariff_id": t.tariff_id,
        "tariff": tariff,
        "next_start": format_class_datetime_in_api(t, nxt) if nxt else None,
    }


@router.get("")
async def get_schedule():
    trainings = await Class.find_all().to_list()
    result = []
    for t in trainings:
        result.append(await _serialize_training(t))
    return result


@router.get("/instances")
async def get_schedule_instances(week_start: str = Query(..., description="Понедельник недели, ISO YYYY-MM-DD")):
    try:
        d = date.fromisoformat(week_start.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректная дата week_start")
    range_start = datetime(d.year, d.month, d.day, 0, 0, 0)
    range_end = range_start + timedelta(days=7) - timedelta(seconds=1)
    classes = await Class.find_all().to_list()
    return expand_instances_in_range(classes, range_start, range_end)


@router.get("/my-bookings")
async def my_bookings(current_user: User = Depends(get_current_user)):
    q = await Booking.find(
        And(Booking.user_id == str(current_user.id), Booking.status == "booked"),
    ).to_list()
    out = []
    for b in q:
        row: dict = {
            "id": str(b.id),
            "training_id": b.training_id,
            "subscription_id": b.subscription_id,
            "session_starts_at": b.session_starts_at.isoformat() if b.session_starts_at else None,
            "sub_profile_id": b.sub_profile_id,
        }
        if b.sub_profile_id:
            sp = await SubProfile.get(b.sub_profile_id)
            if sp:
                row["sub_profile"] = {"first_name": sp.first_name, "last_name": sp.last_name}
        out.append(row)
    return out


def _session_key(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


async def _find_duplicate_booking(
    user_id: str,
    training_id: str,
    sub_profile_id: str | None,
    session_dt: datetime | None,
) -> Booking | None:
    candidates = await Booking.find(
        And(Booking.user_id == user_id, Booking.training_id == training_id, Booking.status == "booked"),
    ).to_list()
    want_sub = sub_profile_id or None
    want_sess = _session_key(session_dt)
    for b in candidates:
        b_sub = b.sub_profile_id or None
        if b_sub != want_sub:
            continue
        b_sess = _session_key(b.session_starts_at)
        if b_sess == want_sess:
            return b
    return None


@router.post("/book")
async def book_training(payload: BookPayload, current_user: User = Depends(get_current_user)):
    session_dt = _parse_session_at(payload.sessionStartsAt)
    subscription_id = payload.subscriptionId
    if payload.sub_profile_id:
        sp = await SubProfile.get(payload.sub_profile_id)
        if not sp or sp.parent_user_id != str(current_user.id):
            raise HTTPException(status_code=400, detail="Подпрофиль не найден")
        if sp.active_subscription_id:
            subscription_id = sp.active_subscription_id
    if not subscription_id:
        raise HTTPException(status_code=400, detail="Укажите абонемент")

    log_event(
        "info",
        "/api/schedule/book",
        "Booking requested",
        str(current_user.id),
        {
            "training_id": payload.trainingId,
            "subscription_id": subscription_id,
            "sub_profile_id": payload.sub_profile_id,
        },
    )
    try:
        training_oid = ObjectId(payload.trainingId)
        sub_oid = ObjectId(subscription_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Некорректные идентификаторы")

    dup = await _find_duplicate_booking(
        str(current_user.id),
        payload.trainingId,
        payload.sub_profile_id,
        session_dt,
    )
    if dup:
        raise HTTPException(status_code=400, detail="Вы уже записаны")

    client = get_mongo_client()
    async with await client.start_session() as session:
        async with session.start_transaction():
            training_col = Class.get_motor_collection()
            sub_col = Subscription.get_motor_collection()
            booking_col = Booking.get_motor_collection()

            training = await training_col.find_one({"_id": training_oid}, session=session)
            if not training:
                raise HTTPException(status_code=404, detail="Тренировка не найдена")
            subscription = await sub_col.find_one({"_id": sub_oid, "user_id": str(current_user.id)}, session=session)
            if not subscription:
                raise HTTPException(status_code=400, detail="Абонемент не найден")
            if subscription.get("remaining_trainings") is not None and subscription["remaining_trainings"] <= 0:
                raise HTTPException(status_code=400, detail="Недостаточно занятий в абонементе")
            cap = training.get("max_capacity")
            if cap is not None and cap > 0 and training.get("booked_count", 0) >= cap:
                raise HTTPException(status_code=400, detail="Свободных мест нет")

            tid = training.get("tariff_id")
            if tid and str(subscription.get("tariff_id")) != str(tid):
                raise HTTPException(status_code=400, detail="Это занятие доступно по другому тарифу")

            doc = {
                "user_id": str(current_user.id),
                "training_id": payload.trainingId,
                "subscription_id": subscription_id,
                "status": "booked",
                "booked_at": datetime.utcnow(),
                "sub_profile_id": payload.sub_profile_id,
                "session_starts_at": session_dt,
            }
            insert_res = await booking_col.insert_one(doc, session=session)
            await training_col.update_one({"_id": training_oid}, {"$inc": {"booked_count": 1}}, session=session)
            if subscription.get("remaining_trainings") is not None:
                await sub_col.update_one({"_id": sub_oid}, {"$inc": {"remaining_trainings": -1}}, session=session)
            log_event(
                "info",
                "/api/schedule/book",
                "Booking created",
                str(current_user.id),
                {"booking_id": str(insert_res.inserted_id)},
            )
            return {"id": str(insert_res.inserted_id), "status": "booked"}


@router.delete("/{booking_id}/cancel")
async def cancel_booking(booking_id: str, current_user: User = Depends(get_current_user)):
    log_event("info", "/api/schedule/cancel", "Booking cancel requested", str(current_user.id), {"booking_id": booking_id})
    try:
        booking_oid = ObjectId(booking_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Некорректный booking id")
    client = get_mongo_client()
    async with await client.start_session() as session:
        async with session.start_transaction():
            booking_col = Booking.get_motor_collection()
            training_col = Class.get_motor_collection()
            sub_col = Subscription.get_motor_collection()

            booking = await booking_col.find_one({"_id": booking_oid, "user_id": str(current_user.id)}, session=session)
            if not booking:
                raise HTTPException(status_code=404, detail="Запись не найдена")
            if booking.get("status") == "cancelled":
                return {"ok": True}

            await booking_col.update_one(
                {"_id": booking_oid},
                {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow()}},
                session=session,
            )
            await training_col.update_one({"_id": ObjectId(booking["training_id"])}, {"$inc": {"booked_count": -1}}, session=session)
            sub = await sub_col.find_one({"_id": ObjectId(booking["subscription_id"])}, session=session)
            if sub and sub.get("remaining_trainings") is not None:
                await sub_col.update_one({"_id": ObjectId(booking["subscription_id"])}, {"$inc": {"remaining_trainings": 1}}, session=session)
            log_event("info", "/api/schedule/cancel", "Booking cancelled", str(current_user.id), {"booking_id": booking_id})
            return {"ok": True}
