import os
import sys
import pytest_asyncio
from httpx import AsyncClient

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.main import app
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_mongo_client


@pytest_asyncio.fixture(scope="session", autouse=True)
async def test_db_setup():
    settings.DATABASE_NAME = f"{settings.DATABASE_NAME}_test"
    await connect_to_mongo()
    yield
    await close_mongo_connection()


@pytest_asyncio.fixture(autouse=True)
async def clean_database():
    client = get_mongo_client()
    db = client[settings.DATABASE_NAME]
    collections = await db.list_collection_names()
    for name in collections:
        await db[name].delete_many({})
    yield


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        yield ac
