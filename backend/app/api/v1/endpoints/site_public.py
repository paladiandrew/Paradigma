"""Публичные данные сайта (без авторизации)."""

from fastapi import APIRouter

from app.models.site_content import SiteContent

router = APIRouter()


@router.get("/about")
async def get_public_about():
    item = await SiteContent.find_one(SiteContent.key == "about")
    return {"value": (item.value if item else "") or ""}
