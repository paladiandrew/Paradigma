import pytest
from datetime import datetime, timedelta
from app.core.security import create_access_token
from app.models.class_model import Class
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.tariff import Tariff
from app.models.user import User


def auth_header(user_id: str, phone: str, role: str = "user"):
    token = create_access_token({"sub": phone, "user_id": user_id, "role": role}, timedelta(hours=1))
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_payment_create_and_webhook_idempotent(client):
    user = User(phone="+79990000001", email="pay@test.com", password_hash="x", role="user", is_email_verified=True, is_phone_verified=True)
    await user.insert()
    tariff = Tariff(name="T1", price=1000, description="d", features=[], bonuses=[], duration_days=30, trainings_count=8)
    await tariff.insert()

    res = await client.post("/api/payments/create-payment", json={"tariff_id": str(tariff.id)}, headers=auth_header(str(user.id), user.phone))
    assert res.status_code == 200

    payment = Payment(user_id=str(user.id), tariff_id=str(tariff.id), amount=1000, payment_id="yo-1", status="pending")
    await payment.insert()
    wh = {"object": {"id": "yo-1", "status": "succeeded"}}
    first = await client.post("/api/payments/webhook", json=wh)
    second = await client.post("/api/payments/webhook", json=wh)
    assert first.status_code == 200
    assert second.status_code == 200
    subs = await Subscription.find_all().to_list()
    assert len(subs) == 1


@pytest.mark.asyncio
async def test_booking_and_cancel_atomic(client):
    user = User(phone="+79990000002", email="book@test.com", password_hash="x", role="user", is_email_verified=True, is_phone_verified=True)
    await user.insert()
    tariff = Tariff(name="T2", price=1000, description="d", features=[], bonuses=[], duration_days=30, trainings_count=2)
    await tariff.insert()
    sub = Subscription(user_id=str(user.id), tariff_id=str(tariff.id), start_date=datetime.utcnow(), end_date=datetime.utcnow() + timedelta(days=30), remaining_trainings=2, status="active")
    await sub.insert()
    training = Class(day_of_week=1, time="10:00", duration=60, trainer_id="t1", trainer_name="Trainer", max_capacity=10, booked_count=0)
    await training.insert()

    book = await client.post("/api/schedule/book", json={"trainingId": str(training.id), "subscriptionId": str(sub.id)}, headers=auth_header(str(user.id), user.phone))
    assert book.status_code == 200
    cancel = await client.delete(f"/api/schedule/{book.json()['id']}/cancel", headers=auth_header(str(user.id), user.phone))
    assert cancel.status_code == 200


@pytest.mark.asyncio
async def test_admin_crud_smoke(client):
    admin = User(phone="+79990000003", email="admin@test.com", password_hash="x", role="admin", is_email_verified=True, is_phone_verified=True)
    await admin.insert()
    headers = auth_header(str(admin.id), admin.phone, "admin")

    create_tariff = await client.post("/api/admin/tariffs", json={"name": "Admin Tariff", "price": 5000, "description": "x", "features": [], "bonuses": []}, headers=headers)
    assert create_tariff.status_code == 200
    tariff_id = create_tariff.json()["id"]
    update_tariff = await client.put(f"/api/admin/tariffs/{tariff_id}", json={"name": "Admin Tariff 2", "price": 5500, "description": "y", "features": [], "bonuses": []}, headers=headers)
    assert update_tariff.status_code == 200
    delete_tariff = await client.delete(f"/api/admin/tariffs/{tariff_id}", headers=headers)
    assert delete_tariff.status_code == 200
