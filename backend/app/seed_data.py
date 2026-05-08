import asyncio
from datetime import datetime, timedelta
from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.class_model import Class
from app.models.event import Event
from app.models.tariff import Tariff
from app.models.trainer import Trainer


async def seed():
    await connect_to_mongo()

    await Tariff.delete_all()
    await Trainer.delete_all()
    await Event.delete_all()
    await Class.delete_all()

    tariffs = [
        Tariff(name="Start", price=4500, description="4 тренировки", popular=False, features=["4 занятия", "Группа новичков"], bonuses=["Первое занятие бесплатно"], duration_days=30, trainings_count=4),
        Tariff(name="Smart", price=7900, description="8 тренировок", popular=True, features=["8 занятий", "Все базовые группы"], bonuses=["Скидка 10% на мерч"], duration_days=30, trainings_count=8),
        Tariff(name="Pro", price=11900, description="12 тренировок", popular=False, features=["12 занятий", "Спарринги"], bonuses=["1 персональная тренировка"], duration_days=30, trainings_count=12),
        Tariff(name="Infinity", price=14900, description="Безлимит", popular=False, features=["Безлимитные тренировки"], bonuses=["Приоритетная запись"], duration_days=30, trainings_count=999),
    ]
    for tariff in tariffs:
        await tariff.insert()

    trainers = [
        Trainer(name="Илья Гудин", specialty="BJJ Kids", photo_url="https://picsum.photos/seed/tr1/300/300", description="Работа с детьми"),
        Trainer(name="Рафиг Салманов", specialty="BJJ Adult", photo_url="https://picsum.photos/seed/tr2/300/300", description="Подготовка к соревнованиям"),
        Trainer(name="Анна Смирнова", specialty="Функциональный тренинг", photo_url="https://picsum.photos/seed/tr3/300/300", description="ОФП и мобильность"),
        Trainer(name="Максим Орлов", specialty="Грэпплинг", photo_url="https://picsum.photos/seed/tr4/300/300", description="Техника и спарринги"),
    ]
    for trainer in trainers:
        await trainer.insert()

    events = [
        Event(type="promotion", title="Скидка 20% новичкам", description="Акция на первый месяц", date=datetime.utcnow(), end_date=datetime.utcnow() + timedelta(days=10)),
        Event(type="promotion", title="2+1 на абонементы", description="Третий месяц в подарок", date=datetime.utcnow(), end_date=datetime.utcnow() + timedelta(days=20)),
        Event(type="news", title="Открыта новая группа", description="Набор в вечернюю группу", date=datetime.utcnow()),
        Event(type="news", title="Новый тренер", description="К команде присоединился новый тренер", date=datetime.utcnow()),
        Event(type="event", title="Внутриклубный турнир", description="Турнир среди учеников", date=datetime.utcnow() + timedelta(days=15)),
    ]
    for event in events:
        await event.insert()

    schedule = [
        (1, "09:00", 60, trainers[0]), (1, "19:00", 90, trainers[1]),
        (2, "10:00", 60, trainers[2]), (2, "20:00", 90, trainers[3]),
        (3, "18:30", 90, trainers[1]), (4, "19:30", 90, trainers[3]),
        (5, "17:00", 60, trainers[0]), (6, "12:00", 90, trainers[2]),
    ]
    for day, time, duration, trainer in schedule:
        await Class(
            day_of_week=day,
            time=time,
            duration=duration,
            trainer_id=str(trainer.id),
            trainer_name=trainer.name,
            trainer_avatar=trainer.photo_url,
            max_capacity=20,
            booked_count=0,
        ).insert()

    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed())
