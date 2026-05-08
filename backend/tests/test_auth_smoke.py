import pytest
from app.models.user import User


@pytest.mark.asyncio
async def test_register_and_login(client):
    payload = {
        "username": "ivan_user",
        "first_name": "Ivan",
        "last_name": "Petrov",
        "phone": "+79990001122",
        "email": "ivan@example.com",
        "password": "password123",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    user = await User.find_one(User.username == "ivan_user")
    assert user is not None

    login = await client.post("/api/auth/login", json={"login": "ivan_user", "password": "password123"})
    assert login.status_code == 200
    body = login.json()
    assert body.get("access_token")
    assert "requires_2fa" not in body


@pytest.mark.asyncio
async def test_login_by_email_legacy(client):
    await client.post(
        "/api/auth/register",
        json={
            "username": "legacy_u",
            "first_name": "A",
            "last_name": "B",
            "email": "legacy@example.com",
            "password": "password123",
        },
    )
    login = await client.post("/api/auth/login", json={"login": "legacy@example.com", "password": "password123"})
    assert login.status_code == 200
    assert login.json().get("access_token")
