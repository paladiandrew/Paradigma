from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.class_model import Class
from app.models.trainer import Trainer
from app.models.booking import Booking
from app.models.tariff import Tariff
from app.models.subscription import Subscription
from app.models.payment import Payment
from app.models.event import Event
from app.models.about import About
from app.models.admin_log import AdminLog
from app.models.site_content import SiteContent
from app.models.sub_profile import SubProfile
from app.core.default_about import DEFAULT_ABOUT_TEXT

client: AsyncIOMotorClient = None


async def ensure_about_site_content() -> None:
    """Если в site_contents нет текста about или он пустой — записать текст по умолчанию (не затирать уже заполненное)."""
    item = await SiteContent.find_one(SiteContent.key == "about")
    if not item:
        await SiteContent(key="about", value=DEFAULT_ABOUT_TEXT).insert()
        return
    if not (item.value or "").strip():
        item.value = DEFAULT_ABOUT_TEXT
        await item.save()


async def connect_to_mongo():
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.DATABASE_NAME],
        document_models=[
            User,
            Class,
            Trainer,
            Booking,
            Tariff,
            Subscription,
            Payment,
            Event,
            About,
            AdminLog,
            SiteContent,
            SubProfile,
        ],
    )
    await ensure_about_site_content()


async def close_mongo_connection():
    global client
    if client:
        client.close()


def get_mongo_client() -> AsyncIOMotorClient:
    return client
