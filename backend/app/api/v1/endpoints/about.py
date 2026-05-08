from fastapi import APIRouter
from app.models.event import Event

router = APIRouter()

@router.get("/")
async def get_about():
    """Информация об академии"""
    return {
        "name": "Paradigma BJJ",
        "description": "Академия единоборств",
        "address": "г. Москва, ул. Примерная, д. 123",
        "phone": "+7 (XXX) XXX-XX-XX",
        "email": "info@paradigma-bjj.ru",
        "working_hours": "Пн-Вс: 9:00 - 22:00"
    }

@router.get("/events")
async def get_events():
    """События (новости и акции)"""
    events = await Event.find({"is_active": True}).sort("-date").to_list()
    return events


