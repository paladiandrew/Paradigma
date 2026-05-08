import json
import logging
from datetime import date, datetime, timezone
from typing import Any
from app.core.request_context import request_id_ctx


logger = logging.getLogger("app")


def _json_default(o: Any) -> Any:
    if isinstance(o, datetime):
        return o.isoformat()
    if isinstance(o, date):
        return o.isoformat()
    raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")


def log_event(level: str, endpoint: str, message: str, user_id: str | None = None, details: dict | None = None):
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level.upper(),
        "request_id": request_id_ctx.get(),
        "endpoint": endpoint,
        "user_id": user_id,
        "message": message,
        "details": details or {},
    }
    text = json.dumps(payload, ensure_ascii=False, default=_json_default)
    if level.lower() == "error":
        logger.error(text)
    elif level.lower() == "warning":
        logger.warning(text)
    else:
        logger.info(text)
