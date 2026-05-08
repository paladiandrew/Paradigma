from fastapi import APIRouter, Depends, HTTPException, status
from app.models.booking import Booking
from app.models.class_model import Class
from app.models.user import User
from app.api.v1.endpoints.users import get_current_user

router = APIRouter()

@router.post("/")
async def create_booking(class_id: str, current_user: User = Depends(get_current_user)):
    """Запись на занятие"""
    class_item = await Class.get(class_id)
    if not class_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Занятие не найдено"
        )
    
    if class_item.current_participants >= class_item.max_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Места закончились"
        )
    
    # Проверка на дубликат
    existing_booking = await Booking.find_one(
        Booking.user.id == current_user.id,
        Booking.class_item.id == class_id,
        Booking.status == "confirmed"
    )
    if existing_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Вы уже записаны на это занятие"
        )
    
    booking = Booking(
        user=current_user,
        class_item=class_item,
        status="confirmed"
    )
    await booking.insert()
    
    # Увеличиваем счетчик участников
    class_item.current_participants += 1
    await class_item.save()
    
    return booking

@router.get("/")
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    """Получение моих бронирований"""
    bookings = await Booking.find(
        Booking.user.id == current_user.id
    ).to_list()
    return bookings

@router.delete("/{booking_id}")
async def cancel_booking(booking_id: str, current_user: User = Depends(get_current_user)):
    """Отмена бронирования"""
    booking = await Booking.get(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено"
        )
    
    if str(booking.user.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа"
        )
    
    booking.status = "cancelled"
    from datetime import datetime
    booking.cancelled_at = datetime.utcnow()
    await booking.save()
    
    # Уменьшаем счетчик участников
    class_item = await Class.get(booking.class_item.id)
    if class_item:
        class_item.current_participants = max(0, class_item.current_participants - 1)
        await class_item.save()
    
    return {"message": "Бронирование отменено"}


