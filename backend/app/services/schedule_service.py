"""Вычисление ближайших вхождений занятий для календаря и профиля."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from app.services.class_schedule_payload import format_occurrence_for_api

if TYPE_CHECKING:
    from app.models.class_model import Class


def _parse_time(time_str: str) -> tuple[int, int]:
    parts = (time_str or "10:00").strip().split(":")
    h = int(parts[0])
    m = int(parts[1]) if len(parts) > 1 else 0
    return h, m


def _python_weekday_to_app_dow(py_wd: int) -> int:
    """Python weekday Mon=0 … Sun=6 → приложение: Вс=0, Пн=1 … Сб=6."""
    return (py_wd + 1) % 7


def _combine(d: date, hour: int, minute: int) -> datetime:
    return datetime(d.year, d.month, d.day, hour, minute, 0)


def _to_date(val: Any) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, str) and val.strip():
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00")).date()
        except ValueError:
            return None
    return None


def resolve_nominal_to_effective(cls: "Class", nominal: datetime) -> Optional[datetime]:
    """None — вхождение отменено (cancel). Иначе фактическое дата-время (move или nominal)."""
    d = nominal.date()
    moved: Optional[datetime] = None
    for ov in cls.overrides or []:
        if not isinstance(ov, dict):
            continue
        action = ov.get("action")
        od = _to_date(ov.get("date"))
        if od is None or od != d:
            continue
        if action == "cancel":
            return None
        if action == "move":
            new_d = _to_date(ov.get("new_date"))
            if new_d is None:
                new_d = d
            nt = ov.get("new_time")
            nh, nm = _parse_time(nt if isinstance(nt, str) and nt.strip() else cls.time)
            moved = _combine(new_d, nh, nm)
    if moved is not None:
        return moved
    return nominal


def _biweekly_ok(cls: "Class", day: date) -> bool:
    if cls.recurrence != "biweekly":
        return True
    anchor = cls.start_datetime.date() if cls.start_datetime else day
    if (day - anchor).days < 0:
        return False
    return ((day - anchor).days // 7) % 2 == 0


def next_occurrence_after(cls: "Class", after: datetime) -> Optional[datetime]:
    """Следующее эффективное вхождение строго после момента `after` (учёт overrides)."""
    h, m = _parse_time(cls.time)

    if cls.recurrence == "once":
        if not cls.start_datetime:
            return None
        eff = resolve_nominal_to_effective(cls, cls.start_datetime)
        return eff if eff and eff > after else None

    for i in range(0, 400):
        day = after.date() + timedelta(days=i)
        py_wd = day.weekday()
        if _python_weekday_to_app_dow(py_wd) != cls.day_of_week:
            continue
        if not _biweekly_ok(cls, day):
            continue
        nominal = _combine(day, h, m)
        if nominal <= after:
            continue
        eff = resolve_nominal_to_effective(cls, nominal)
        if eff is None:
            continue
        if eff > after:
            return eff
    return None


def _same_wall_clock(a: datetime, b: datetime) -> bool:
    return (
        a.year == b.year
        and a.month == b.month
        and a.day == b.day
        and a.hour == b.hour
        and a.minute == b.minute
    )


def format_class_datetime_in_api(cls: "Class", dt: datetime) -> str:
    """Один момент занятия для JSON (next_start и т.д.): разовое без переноса — UTC с Z, иначе локальное время зала."""
    if (
        cls.recurrence == "once"
        and cls.start_datetime is not None
        and _same_wall_clock(dt, cls.start_datetime)
    ):
        return format_occurrence_for_api(dt, utc_instant=True)
    return format_occurrence_for_api(dt, utc_instant=False)


def _iter_nominal_in_range(cls: "Class", range_start: datetime, range_end: datetime) -> List[datetime]:
    out: List[datetime] = []
    h, m = _parse_time(cls.time)

    if cls.recurrence == "once":
        sd = cls.start_datetime
        if sd is None:
            return out
        occ_d = sd.astimezone(timezone.utc).date() if sd.tzinfo is not None else sd.date()
        d0, d1 = range_start.date(), range_end.date()
        if d0 <= occ_d <= d1:
            out.append(sd)
        return out

    day = range_start.date()
    end_d = range_end.date()
    while day <= end_d:
        py_wd = day.weekday()
        if _python_weekday_to_app_dow(py_wd) == cls.day_of_week and _biweekly_ok(cls, day):
            nominal = _combine(day, h, m)
            if range_start <= nominal <= range_end:
                out.append(nominal)
        day += timedelta(days=1)
    return out


def occurrences_in_range(cls: "Class", range_start: datetime, range_end: datetime) -> List[Dict[str, Any]]:
    """Список вхождений с учётом overrides: display_starts_at, nominal_starts_at, cancelled, moved."""
    result: List[Dict[str, Any]] = []
    for nominal in sorted(_iter_nominal_in_range(cls, range_start, range_end)):
        eff = resolve_nominal_to_effective(cls, nominal)
        cancelled = eff is None
        moved = eff is not None and eff != nominal
        once = cls.recurrence == "once"
        nominal_utc = once
        if cancelled:
            result.append(
                {
                    "nominal_starts_at": format_occurrence_for_api(nominal, utc_instant=nominal_utc),
                    "display_starts_at": format_occurrence_for_api(nominal, utc_instant=nominal_utc),
                    "cancelled": True,
                    "moved": False,
                }
            )
        else:
            display_dt = eff if eff is not None else nominal
            display_utc = once and not moved
            result.append(
                {
                    "nominal_starts_at": format_occurrence_for_api(nominal, utc_instant=nominal_utc),
                    "display_starts_at": format_occurrence_for_api(display_dt, utc_instant=display_utc),
                    "cancelled": False,
                    "moved": moved,
                }
            )
    return result


def admin_occurrences_preview(cls: "Class", weeks: int = 4) -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    end = now + timedelta(weeks=weeks)
    return occurrences_in_range(cls, now, end)


def expand_instances_in_range(
    all_classes: List["Class"],
    range_start: datetime,
    range_end: datetime,
) -> List[Dict[str, Any]]:
    """Плоский список экземпляров занятий для календаря."""
    rows: List[Dict[str, Any]] = []
    for c in all_classes:
        for occ in occurrences_in_range(c, range_start, range_end):
            if occ.get("cancelled"):
                continue
            rows.append(
                {
                    "class_id": str(c.id),
                    "starts_at": occ["display_starts_at"],
                    "nominal_starts_at": occ["nominal_starts_at"],
                    "duration": c.duration,
                    "title": display_title_for_class(c),
                    "category": c.category,
                    "trainer": {"id": c.trainer_id, "name": c.trainer_name, "avatar": c.trainer_avatar},
                    "max_capacity": c.max_capacity,
                    "booked_count": c.booked_count,
                    "tariff_id": c.tariff_id,
                    "recurrence": c.recurrence,
                }
            )
    rows.sort(key=lambda r: r["starts_at"])
    return rows


def nearest_in_window(cls: "Class", window_start: datetime, window_end: datetime) -> Optional[datetime]:
    """Ближайшее вхождение в полуинтервале [window_start, window_end]."""
    t = next_occurrence_after(cls, window_start - timedelta(seconds=1))
    if t is None or t > window_end:
        return None
    return t


def display_title_for_class(cls: "Class") -> str:
    if cls.title and str(cls.title).strip():
        return cls.title.strip()
    if cls.category == "other" and cls.other_label:
        return cls.other_label
    return cls.trainer_name or "Занятие"


async def nearest_session_for_tariff(tariff_id: str, window_days: int = 7) -> dict | None:
    from app.models.class_model import Class
    from app.models.tariff import Tariff

    now = datetime.utcnow()
    end = now + timedelta(days=window_days)
    classes = await Class.find(Class.tariff_id == tariff_id).to_list()
    best: tuple[datetime, Class] | None = None
    for c in classes:
        n = nearest_in_window(c, now, end)
        if n is None:
            continue
        if best is None or n < best[0]:
            best = (n, c)
    if not best:
        return None
    n, c = best
    tdoc = await Tariff.get(tariff_id)
    return {
        "starts_at": format_class_datetime_in_api(c, n),
        "class_id": str(c.id),
        "title": display_title_for_class(c),
        "duration": c.duration,
        "tariff_name": tdoc.name if tdoc else "",
    }
