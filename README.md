# Paradigma BJJ

Монорепозиторий: **frontend** (React + Vite + MUI) и **backend** (FastAPI + Beanie + MongoDB).

## Локальная разработка

**Backend:** из каталога `backend` — виртуальное окружение, `pip install -r requirements.txt`, файл `.env` по образцу `.env.example`, запуск `uvicorn app.main:app --reload`.

**Frontend:** из каталога `frontend` — `npm install`, при необходимости переменная `VITE_API_URL` (см. `.env.example`), `npm run dev`.

## Деплой на VPS (Nginx + systemd)

Пошаговая инструкция, пример конфига Nginx и unit systemd: [**deploy/DEPLOY.md**](deploy/DEPLOY.md).
