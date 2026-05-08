from fastapi import APIRouter
from app.models.tariff import Tariff

router = APIRouter()

@router.get("/")
async def get_tariffs():
    tariffs = await Tariff.find_all().to_list()
    return tariffs

@router.get("/{tariff_id}")
async def get_tariff(tariff_id: str):
    """Получение информации о тарифе"""
    tariff = await Tariff.get(tariff_id)
    if not tariff:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тариф не найден"
        )
    return tariff


