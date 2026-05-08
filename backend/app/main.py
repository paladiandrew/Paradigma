from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import uuid
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v1.api import api_router
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.config import settings
from app.core.request_context import request_id_ctx
from app.core.log import log_event
from app.core.paths import AVATAR_UPLOAD_DIR, UPLOAD_ROOT


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="Paradigma BJJ API",
    description="API для академии единоборств Paradigma BJJ",
    version="1.0.0",
    lifespan=lifespan
)
logging.basicConfig(level=logging.INFO, format="%(message)s")


def error_response(code: str, message: str, details=None, status_code: int = 400):
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error": {"code": code, "message": message, "details": details}},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
    log_event("warning", endpoint=_request.url.path, message="HTTP exception", details={"status_code": exc.status_code, "detail": str(exc.detail)})
    return error_response(code=f"HTTP_{exc.status_code}", message=str(exc.detail), status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    log_event("warning", endpoint=_request.url.path, message="Validation exception", details={"errors": exc.errors()})
    return error_response(code="VALIDATION_ERROR", message="Некорректные данные запроса", details=exc.errors(), status_code=422)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    log_event("error", endpoint=_request.url.path, message="Unhandled exception", details={"error": str(exc)})
    return error_response(code="INTERNAL_ERROR", message="Что-то пошло не так", details=str(exc), status_code=500)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    token = request_id_ctx.set(request_id)
    try:
        response = await call_next(request)
    finally:
        request_id_ctx.reset(token)
    response.headers["x-request-id"] = request_id
    return response

# CORS middleware для работы с frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")

# StaticFiles требует существующий каталог при импорте (до срабатывания lifespan)
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

@app.get("/")
async def root():
    return {"message": "Paradigma BJJ API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

