from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.api.v1.endpoints.users import get_admin_user
from app.core.security import get_password_hash
from app.models.admin_log import AdminLog
from app.models.class_model import Class
from app.models.event import Event
from app.models.site_content import SiteContent
from app.models.tariff import Tariff
from app.models.user import User
from app.schemas.user import USERNAME_RE, validate_bcrypt_password_bytes
from app.schemas.class_schedule import ClassCreatePayload, ClassUpdatePayload
from app.services.class_schedule_payload import (
    apply_once_time_and_dow_from_start,
    normalize_class_payload,
    normalize_overrides_list,
    payload_without_id,
    store_start_datetime_utc_naive,
)
from app.services.schedule_service import admin_occurrences_preview
from app.utils.user_serialize import user_to_dict
from app.core.log import log_event
from app.core.paths import NEWS_UPLOAD_DIR

router = APIRouter()

ALLOWED_NEWS_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_NEWS_IMAGE_BYTES = 5 * 1024 * 1024


def _normalize_phone_ru(raw: str | None) -> str:
    if not raw or not str(raw).strip():
        return ""
    s = raw.strip().replace("+", "").replace(" ", "")
    digits = "".join(c for c in s if c.isdigit())
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    elif len(digits) == 10 and digits.startswith("9"):
        digits = "7" + digits
    return digits


class CreateTrainerBody(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_norm(cls, v: str) -> str:
        s = v.strip().lower()
        if not USERNAME_RE.match(s):
            raise ValueError("Некорректный логин")
        return s

    @field_validator("password")
    @classmethod
    def pwd_ok(cls, v: str) -> str:
        return validate_bcrypt_password_bytes(v)


async def write_log(admin: User, action: str, entity_type: str, entity_id: str | None = None, details: dict | None = None):
    await AdminLog(admin_id=str(admin.id), action=action, entity_type=entity_type, entity_id=entity_id, details=details or {}).insert()
    log_event("info", "/api/admin", f"Admin action: {action}", str(admin.id), {"entity_type": entity_type, "entity_id": entity_id, "details": details or {}})


async def _validate_schedule_trainer_id(trainer_id: str | None) -> None:
    if not trainer_id:
        return
    u = await User.get(trainer_id)
    if not u or u.role != "trainer":
        raise HTTPException(status_code=400, detail={"trainer_id": "Тренер не найден"})


async def _validate_schedule_tariff_id(tariff_id: str | None) -> None:
    if not tariff_id:
        return
    t = await Tariff.get(tariff_id)
    if not t:
        raise HTTPException(status_code=400, detail={"tariff_id": "Тариф не найден"})


@router.get("/events")
async def list_events(
    _admin: User = Depends(get_admin_user),
    event_type: str | None = Query(None, alias="type", description="Фильтр: promotion, news, event"),
):
    if event_type:
        return await Event.find({"type": event_type}).sort("-date").to_list()
    return await Event.find().sort("-date").to_list()


@router.post("/events")
async def create_event(payload: dict, admin: User = Depends(get_admin_user)):
    item = Event(**payload_without_id(payload))
    await item.insert()
    await write_log(admin, "create", "event", str(item.id), payload)
    return item


@router.put("/events/{event_id}")
async def update_event(event_id: str, payload: dict, admin: User = Depends(get_admin_user)):
    item = await Event.get(event_id)
    if not item:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    for key, value in payload.items():
        if key in ("id", "_id"):
            continue
        setattr(item, key, value)
    await item.save()
    await write_log(admin, "update", "event", str(item.id), payload)
    return item


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, admin: User = Depends(get_admin_user)):
    item = await Event.get(event_id)
    if item:
        await item.delete()
    await write_log(admin, "delete", "event", event_id)
    return {"ok": True}


@router.get("/tariffs")
async def tariffs(_admin: User = Depends(get_admin_user)):
    return await Tariff.find_all().to_list()


@router.post("/tariffs")
async def create_tariff(payload: dict, admin: User = Depends(get_admin_user)):
    item = Tariff(**payload_without_id(payload))
    await item.insert()
    await write_log(admin, "create", "tariff", str(item.id), payload)
    return item


@router.put("/tariffs/{tariff_id}")
async def update_tariff(tariff_id: str, payload: dict, admin: User = Depends(get_admin_user)):
    item = await Tariff.get(tariff_id)
    if not item:
        raise HTTPException(status_code=404, detail="Тариф не найден")
    for key, value in payload.items():
        if key in ("id", "_id"):
            continue
        setattr(item, key, value)
    await item.save()
    await write_log(admin, "update", "tariff", str(item.id), payload)
    return item


@router.delete("/tariffs/{tariff_id}")
async def delete_tariff(tariff_id: str, admin: User = Depends(get_admin_user)):
    item = await Tariff.get(tariff_id)
    if item:
        await item.delete()
    await write_log(admin, "delete", "tariff", tariff_id)
    return {"ok": True}


@router.get("/trainers")
async def list_trainer_users(_admin: User = Depends(get_admin_user)):
    trainers = await User.find(User.role == "trainer").sort(User.created_at).to_list()
    return [user_to_dict(u) for u in trainers]


@router.post("/trainers")
async def create_trainer_user(body: CreateTrainerBody, admin: User = Depends(get_admin_user)):
    if await User.find_one(User.username == body.username):
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует")
    try:
        pwd_hash = get_password_hash(body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    phone_norm = _normalize_phone_ru(body.phone)
    user = User(
        username=body.username,
        password_hash=pwd_hash,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        phone=phone_norm,
        role="trainer",
        specialty=(body.specialty.strip() if body.specialty else None) or None,
        is_email_verified=False,
        is_phone_verified=False,
        show_on_homepage=False,
    )
    await user.insert()
    await write_log(admin, "create", "trainer_user", str(user.id), {"username": body.username})
    return user_to_dict(user)


@router.delete("/trainers/{user_id}")
async def delete_trainer_user(user_id: str, admin: User = Depends(get_admin_user)):
    user = await User.get(user_id)
    if not user or user.role != "trainer":
        raise HTTPException(status_code=404, detail="Тренер не найден")
    await user.delete()
    await write_log(admin, "delete", "trainer_user", user_id)
    return {"ok": True}


@router.get("/users")
async def users(_admin: User = Depends(get_admin_user)):
    q = await User.find(User.role == "user").sort(User.created_at).to_list()
    return [user_to_dict(u) for u in q]


@router.put("/users/{user_id}/role")
async def set_role(user_id: str, payload: dict, admin: User = Depends(get_admin_user)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    role = payload.get("role", user.role)
    if role not in ("user", "admin", "trainer"):
        raise HTTPException(status_code=400, detail="Недопустимая роль")
    user.role = role
    await user.save()
    await write_log(admin, "change_role", "user", str(user.id), payload)
    return user_to_dict(user)


@router.post("/upload/news-image")
async def admin_upload_news_image(
    request: Request,
    file: UploadFile = File(...),
    _admin: User = Depends(get_admin_user),
):
    NEWS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct not in ALLOWED_NEWS_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Разрешены только JPEG, PNG или WebP")
    raw = await file.read()
    if len(raw) > MAX_NEWS_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Размер файла не более 5 МБ")
    ext = ALLOWED_NEWS_IMAGE_TYPES[ct]
    fname = f"{uuid4().hex}{ext}"
    path = NEWS_UPLOAD_DIR / fname
    path.write_bytes(raw)
    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/uploads/news/{fname}"}


@router.get("/about")
async def get_about(_admin: User = Depends(get_admin_user)):
    item = await SiteContent.find_one(SiteContent.key == "about")
    return {"value": item.value if item else ""}


@router.put("/about")
async def put_about(payload: dict, admin: User = Depends(get_admin_user)):
    item = await SiteContent.find_one(SiteContent.key == "about")
    if not item:
        item = SiteContent(key="about", value="")
    item.value = payload.get("value") or payload.get("text") or ""
    item.updated_at = datetime.utcnow()
    await item.save()
    await write_log(admin, "update", "site_content", str(item.id), {"key": "about"})
    return {"value": item.value}


@router.get("/admins")
async def admins(_admin: User = Depends(get_admin_user)):
    q = await User.find(User.role == "admin").to_list()
    return [user_to_dict(u) for u in q]


@router.get("/logs")
async def logs(_admin: User = Depends(get_admin_user)):
    return await AdminLog.find_all().sort(-AdminLog.created_at).to_list()


@router.get("/schedule")
async def list_schedule_classes(_admin: User = Depends(get_admin_user)):
    return await Class.find_all().to_list()


@router.post("/schedule")
async def create_schedule_class(payload: ClassCreatePayload, admin: User = Depends(get_admin_user)):
    d = payload.model_dump()
    if d.get("category") == "trainer":
        if not d.get("trainer_id"):
            raise HTTPException(status_code=400, detail={"trainer_id": "Выберите тренера"})
        if not d.get("tariff_id"):
            raise HTTPException(status_code=400, detail={"tariff_id": "Выберите тариф"})
    await _validate_schedule_trainer_id(d.get("trainer_id"))
    await _validate_schedule_tariff_id(d.get("tariff_id"))
    trainer_name = ""
    trainer_avatar = None
    tid = d.get("trainer_id")
    if tid:
        u = await User.get(tid)
        if u:
            trainer_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or (u.username or "")
            trainer_avatar = u.avatar_url
    if d.get("start_datetime"):
        d["start_datetime"] = store_start_datetime_utc_naive(d["start_datetime"])
    apply_once_time_and_dow_from_start(d)
    item = Class(
        title=d["title"],
        category=d["category"],
        recurrence=d["recurrence"],
        day_of_week=d["day_of_week"],
        time=d["time"],
        duration=d["duration"],
        start_datetime=d["start_datetime"],
        trainer_id=tid or "",
        trainer_name=trainer_name,
        trainer_avatar=trainer_avatar,
        tariff_id=d.get("tariff_id"),
        max_capacity=d.get("max_capacity"),
        other_label=d.get("other_label"),
        repeat_weeks=d.get("repeat_weeks"),
        overrides=[],
        booked_count=0,
    )
    await item.insert()
    await write_log(admin, "create", "class", str(item.id), d)
    return item


@router.put("/schedule/{class_id}")
async def update_schedule_class(class_id: str, payload: ClassUpdatePayload, admin: User = Depends(get_admin_user)):
    item = await Class.get(class_id)
    if not item:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    patch = payload.model_dump(exclude_unset=True)
    if "trainer_id" in patch:
        await _validate_schedule_trainer_id(patch.get("trainer_id"))
    if "tariff_id" in patch:
        await _validate_schedule_tariff_id(patch.get("tariff_id"))
    if "start_datetime" in patch:
        patch["start_datetime"] = store_start_datetime_utc_naive(patch["start_datetime"])
    rec_eff = patch.get("recurrence", item.recurrence)
    if rec_eff == "once" and patch.get("start_datetime") is not None:
        tmp = {"recurrence": "once", "start_datetime": patch["start_datetime"]}
        apply_once_time_and_dow_from_start(tmp)
        patch["time"] = tmp["time"]
        patch["day_of_week"] = tmp["day_of_week"]
    if "overrides" in patch and patch["overrides"] is not None:
        patch["overrides"] = normalize_overrides_list(patch["overrides"])
    if "trainer_id" in patch:
        t_id = patch.get("trainer_id")
        if t_id:
            u = await User.get(t_id)
            if u:
                patch["trainer_name"] = f"{u.first_name or ''} {u.last_name or ''}".strip() or (u.username or "")
                patch["trainer_avatar"] = u.avatar_url
        else:
            patch.setdefault("trainer_name", "")
            patch.setdefault("trainer_avatar", None)
    for key, value in patch.items():
        setattr(item, key, value)
    await item.save()
    await write_log(admin, "update", "class", str(item.id), patch)
    return item


@router.get("/schedule/{class_id}/occurrences")
async def schedule_class_occurrences(
    class_id: str,
    weeks: int = Query(4, ge=1, le=52),
    _admin: User = Depends(get_admin_user),
):
    item = await Class.get(class_id)
    if not item:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    return admin_occurrences_preview(item, weeks=weeks)


@router.delete("/schedule/{class_id}")
async def delete_schedule_class(class_id: str, admin: User = Depends(get_admin_user)):
    item = await Class.get(class_id)
    if item:
        await item.delete()
    await write_log(admin, "delete", "class", class_id)
    return {"ok": True}
