"""Нормализация тела запроса для занятий расписания (админка и кабинет тренера)."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import settings


def club_tz():
    """Часовой пояс зала (IANA). На Windows без tzdata — фиксированное UTC+3 для Europe/Moscow."""
    key = settings.CLUB_TIMEZONE or "Europe/Moscow"
    try:
        return ZoneInfo(key)
    except ZoneInfoNotFoundError:
        if key in ("Europe/Moscow", "MSK", "W-SU"):
            return timezone(timedelta(hours=3))
        return timezone.utc


def store_start_datetime_utc_naive(dt: datetime | None) -> datetime | None:
    """Храним момент как naive UTC (как приходит из ISO с Z), чтобы сравнения с диапазоном недели были предсказуемыми."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def apply_once_time_and_dow_from_start(data: dict) -> None:
    """Для разового занятия: time и day_of_week — по локальному времени зала (CLUB_TIMEZONE), не по UTC-часам в БД."""
    if data.get("recurrence") != "once":
        return
    sd = data.get("start_datetime")
    if not isinstance(sd, datetime):
        return
    if sd.tzinfo is None:
        sd_utc = sd.replace(tzinfo=timezone.utc)
    else:
        sd_utc = sd.astimezone(timezone.utc)
    local = sd_utc.astimezone(club_tz())
    data["time"] = f"{local.hour:02d}:{local.minute:02d}"
    data["day_of_week"] = (local.weekday() + 1) % 7


def isoformat_utc_stored_naive(dt: datetime | None) -> str | None:
    """Naive datetime в БД для абсолютного момента — хранится как UTC; в JSON добавляем Z для корректного разбора в браузере."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def format_occurrence_for_api(dt: datetime, *, utc_instant: bool) -> str:
    """Сериализация вхождения в API: utc_instant=True — naive UTC (разовые); иначе naive в часовом поясе зала."""
    tz = club_tz()
    if dt.tzinfo is not None:
        return dt.isoformat()
    if utc_instant:
        return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    return dt.replace(tzinfo=tz).isoformat()

_CLASS_KEYS = (
    "day_of_week",
    "time",
    "duration",
    "trainer_id",
    "trainer_name",
    "trainer_avatar",
    "max_capacity",
    "booked_count",
    "title",
    "category",
    "recurrence",
    "start_datetime",
    "tariff_id",
    "other_label",
    "repeat_weeks",
    "overrides",
)


def payload_without_id(payload: dict) -> dict:
    data = dict(payload)
    data.pop("id", None)
    data.pop("_id", None)
    return data


def normalize_overrides_list(raw: Any) -> List[Dict[str, Any]]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        row = dict(item)
        for key in ("date", "new_date"):
            v = row.get(key)
            if isinstance(v, str) and v.strip():
                try:
                    row[key] = datetime.fromisoformat(v.replace("Z", "+00:00"))
                except ValueError:
                    pass
        out.append(row)
    return out


def normalize_class_payload(payload: dict) -> dict:
    data = {k: payload[k] for k in _CLASS_KEYS if k in payload}
    raw_sd = data.get("start_datetime")
    if isinstance(raw_sd, str) and raw_sd.strip():
        try:
            data["start_datetime"] = datetime.fromisoformat(raw_sd.replace("Z", "+00:00"))
        except ValueError:
            data["start_datetime"] = None
    elif raw_sd in ("", None):
        data["start_datetime"] = None
    for key in ("trainer_id", "tariff_id"):
        if data.get(key) == "":
            data[key] = None
    if "max_capacity" in data:
        mc = data["max_capacity"]
        if mc in ("", None):
            data["max_capacity"] = None
        elif isinstance(mc, str) and not str(mc).strip():
            data["max_capacity"] = None
    if "repeat_weeks" in data and data["repeat_weeks"] in ("", None):
        data["repeat_weeks"] = None
    if "overrides" in data:
        data["overrides"] = normalize_overrides_list(data["overrides"])
    if isinstance(data.get("start_datetime"), datetime):
        data["start_datetime"] = store_start_datetime_utc_naive(data["start_datetime"])
    apply_once_time_and_dow_from_start(data)
    return data
