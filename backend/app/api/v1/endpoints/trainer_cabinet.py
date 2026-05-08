from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.api.v1.endpoints.users import get_trainer_user
from app.core.paths import AVATAR_UPLOAD_DIR
from app.models.class_model import Class
from app.models.tariff import Tariff
from app.models.user import User
from app.services.class_schedule_payload import (
    isoformat_utc_stored_naive,
    normalize_class_payload,
    payload_without_id,
)
from app.utils.user_serialize import user_to_dict

router = APIRouter()

ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024


def _trainer_public_name(u: User) -> str:
    name = f"{u.first_name or ''} {u.last_name or ''}".strip()
    return name or (u.username or "") or "Тренер"


@router.get("/me")
async def trainer_profile(user: User = Depends(get_trainer_user)):
    return user_to_dict(user)


@router.post("/me/avatar")
async def trainer_upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_trainer_user),
):
    AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="Разрешены только JPEG, PNG или WebP")
    raw = await file.read()
    if len(raw) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Размер файла не более 2 МБ")
    uid = str(user.id)
    ext = ALLOWED_AVATAR_TYPES[ct]
    for old in AVATAR_UPLOAD_DIR.glob(f"{uid}.*"):
        try:
            old.unlink()
        except OSError:
            pass
    fname = f"{uid}{ext}"
    path = AVATAR_UPLOAD_DIR / fname
    path.write_bytes(raw)
    base = str(request.base_url).rstrip("/")
    user.avatar_url = f"{base}/uploads/avatars/{fname}"
    user.updated_at = datetime.utcnow()
    await user.save()
    for c in await Class.find(Class.trainer_id == uid).to_list():
        c.trainer_avatar = user.avatar_url
        await c.save()
    return user_to_dict(user)


@router.delete("/me/avatar")
async def trainer_delete_avatar(user: User = Depends(get_trainer_user)):
    uid = str(user.id)
    AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    for old in AVATAR_UPLOAD_DIR.glob(f"{uid}.*"):
        try:
            old.unlink()
        except OSError:
            pass
    user.avatar_url = None
    user.updated_at = datetime.utcnow()
    await user.save()
    for c in await Class.find(Class.trainer_id == uid).to_list():
        c.trainer_avatar = None
        await c.save()
    return user_to_dict(user)


@router.put("/me")
async def trainer_update_profile(payload: dict, user: User = Depends(get_trainer_user)):
    for key in ["first_name", "last_name", "phone", "email", "specialty", "trainer_bio", "avatar_url"]:
        if key in payload:
            setattr(user, key, payload[key])
    if "show_on_homepage" in payload:
        user.show_on_homepage = bool(payload["show_on_homepage"])
    user.updated_at = datetime.utcnow()
    await user.save()
    return user_to_dict(user)


@router.get("/tariffs")
async def trainer_tariffs_list(_user: User = Depends(get_trainer_user)):
    return await Tariff.find_all().to_list()


def _class_to_api(c: Class) -> dict:
    return {
        "id": str(c.id),
        "day_of_week": c.day_of_week,
        "time": c.time,
        "duration": c.duration,
        "trainer_id": c.trainer_id,
        "trainer_name": c.trainer_name,
        "trainer_avatar": c.trainer_avatar,
        "max_capacity": c.max_capacity,
        "booked_count": c.booked_count,
        "title": c.title,
        "category": c.category,
        "recurrence": c.recurrence,
        "start_datetime": isoformat_utc_stored_naive(c.start_datetime),
        "tariff_id": c.tariff_id,
        "other_label": c.other_label,
        "overrides": c.overrides or [],
    }


@router.get("/classes")
async def trainer_my_classes(user: User = Depends(get_trainer_user)):
    uid = str(user.id)
    items = await Class.find(Class.trainer_id == uid).to_list()
    return [_class_to_api(c) for c in items]


@router.post("/classes")
async def trainer_create_class(payload: dict, user: User = Depends(get_trainer_user)):
    body = payload_without_id(payload)
    data = normalize_class_payload(body)
    data["trainer_id"] = str(user.id)
    data["trainer_name"] = _trainer_public_name(user)
    data["trainer_avatar"] = user.avatar_url
    item = Class(**data)
    await item.insert()
    return _class_to_api(item)


@router.put("/classes/{class_id}")
async def trainer_update_class(class_id: str, payload: dict, user: User = Depends(get_trainer_user)):
    item = await Class.get(class_id)
    if not item:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if item.trainer_id != str(user.id):
        raise HTTPException(status_code=403, detail="Можно редактировать только свои занятия")
    body = payload_without_id(payload)
    data = normalize_class_payload(body)
    data["trainer_id"] = str(user.id)
    data["trainer_name"] = _trainer_public_name(user)
    data["trainer_avatar"] = user.avatar_url
    for key, value in data.items():
        setattr(item, key, value)
    await item.save()
    return _class_to_api(item)


@router.delete("/classes/{class_id}")
async def trainer_delete_class(class_id: str, user: User = Depends(get_trainer_user)):
    item = await Class.get(class_id)
    if not item:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if item.trainer_id != str(user.id):
        raise HTTPException(status_code=403, detail="Можно удалять только свои занятия")
    await item.delete()
    return {"ok": True}
