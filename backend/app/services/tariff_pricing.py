"""Расчёт цены тарифа с учётом скидки."""
from datetime import datetime, timezone

from app.models.tariff import Tariff


def _as_naive_utc(dt: datetime) -> datetime:
    """Сравнение только между naive UTC: BSON/Mongo часто отдаёт aware UTC."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _now_naive_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def discount_is_active(tariff: Tariff, now: datetime | None = None) -> bool:
    now_cmp = _as_naive_utc(now) if now is not None else _now_naive_utc()
    if not tariff.discount_percent or tariff.discount_percent <= 0:
        return False
    if tariff.discount_until is None:
        return True
    return _as_naive_utc(tariff.discount_until) > now_cmp


def effective_price_rub(tariff: Tariff, now: datetime | None = None) -> int:
    now_cmp = _as_naive_utc(now) if now is not None else _now_naive_utc()
    base = int(tariff.price)
    if not discount_is_active(tariff, now_cmp):
        return base
    return max(0, int(round(base * (100 - int(tariff.discount_percent)) / 100)))

