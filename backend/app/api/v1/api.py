from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, schedule, tariffs, payments, admin, events, trainers, trainer_cabinet, sub_profiles, site_public

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(sub_profiles.router, prefix="/users", tags=["sub-profiles"])
api_router.include_router(trainer_cabinet.router, prefix="/trainer", tags=["trainer"])
api_router.include_router(schedule.router, prefix="/schedule", tags=["schedule"])
api_router.include_router(tariffs.router, prefix="/tariffs", tags=["tariffs"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(trainers.router, prefix="/trainers", tags=["trainers"])
api_router.include_router(site_public.router, prefix="/site", tags=["site"])


