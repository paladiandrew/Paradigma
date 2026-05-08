from fastapi import APIRouter, Query
from app.models.event import Event

router = APIRouter()


@router.get("")
async def get_events(
    event_type: str | None = Query(None, alias="type", description="Только: promotion, news, event — если не задан, все записи"),
):
    if event_type:
        events = await Event.find({"type": event_type}).sort("-date").to_list()
    else:
        events = await Event.find().sort("-date").to_list()
    return [
        {
            "id": str(item.id),
            "type": item.type,
            "title": item.title,
            "description": item.description,
            "date": item.date,
            "endDate": item.end_date,
            "imageUrl": item.image_url,
            "linked_tariff_id": getattr(item, "linked_tariff_id", None),
        }
        for item in events
    ]
