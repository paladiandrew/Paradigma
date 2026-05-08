"""Пути к каталогам данных на диске (относительно корня backend/)."""
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
UPLOAD_ROOT = BACKEND_ROOT / "uploads"
AVATAR_UPLOAD_DIR = UPLOAD_ROOT / "avatars"
NEWS_UPLOAD_DIR = UPLOAD_ROOT / "news"
