"""Расчёт цены тарифа с учётом скидки."""
from datetime import datetime

from app.models.tariff import Tariff


def discount_is_active(tariff: Tariff, now: datetime | None = None) -> bool:
    now = now or datetime.utcnow()
    if not tariff.discount_percent or tariff.discount_percent <= 0:
        return False
    if tariff.discount_until is None:
        return True
    return tariff.discount_until > now


def effective_price_rub(tariff: Tariff, now: datetime | None = None) -> int:
    now = now or datetime.utcnow()
    base = int(tariff.price)
    if not discount_is_active(tariff, now):
        return base
    return max(0, int(round(base * (100 - int(tariff.discount_percent)) / 100)))

