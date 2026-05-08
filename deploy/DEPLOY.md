# Деплой Paradigma (frontend + backend) на облачный VPS

Ниже — схема для **Ubuntu 22.04 LTS** (или новее): один сервер, **Nginx** отдаёт статику фронта и проксирует `/api` и `/uploads` на **Uvicorn** за `127.0.0.1:8000`. **MongoDB** — отдельно (MongoDB Atlas или свой инстанс).

Пути в примерах: `/opt/paradigma`. Репозиторий: `https://github.com/paladiandrew/Paradigma.git`

---

## 1. Подготовка сервера

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx python3 python3-venv python3-pip certbot python3-certbot-nginx
```

**Node.js 20+** (для сборки фронта на сервере):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

**Файрвол** (если используется `ufw`):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 2. Клонирование репозитория

```bash
sudo mkdir -p /opt/paradigma
sudo chown $USER:$USER /opt/paradigma
cd /opt/paradigma
git clone https://github.com/paladiandrew/Paradigma.git .
```

Если репозиторий приватный — настройте SSH-ключ на GitHub или используйте PAT при `git clone`.

---

## 3. MongoDB

- **Вариант A:** [MongoDB Atlas](https://www.mongodb.com/atlas) — создайте кластер, разрешите IP сервера в Network Access, возьмите connection string.
- **Вариант B:** MongoDB на той же машине — установите по официальной инструкции для Ubuntu.

В `MONGO_URI` укажите строку подключения (как в локальном `.env`).

---

## 4. Backend

```bash
cd /opt/paradigma/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

Создайте `.env` (секреты не коммитьте; файл уже в `.gitignore`):

```bash
cp .env.example .env
nano .env
sudo chown www-data:www-data .env
sudo chmod 600 .env
```

(Права нужны, чтобы процесс `www-data` из systemd мог прочитать `.env` из рабочего каталога.)

Обязательно задайте для продакшена:

| Переменная | Пример |
|------------|--------|
| `MONGO_URI` | строка подключения к MongoDB |
| `DATABASE_NAME` | имя БД |
| `JWT_SECRET` | длинная случайная строка |
| `FRONTEND_URL` | `https://ВАШ_ДОМЕН` |
| `CORS_ORIGINS` | `["https://ВАШ_ДОМЕН"]` — JSON-массив строк |
| `YOOKASSA_RETURN_URL` | `https://ВАШ_ДОМЕН/tariffs` (если платежи) |

Каталог загрузок должен быть доступен для записи пользователю сервиса:

```bash
sudo mkdir -p /opt/paradigma/backend/uploads
sudo chown -R www-data:www-data /opt/paradigma/backend/uploads
```

Подключите systemd (из корня репозитория):

```bash
sudo cp /opt/paradigma/deploy/paradigma-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now paradigma-api
sudo systemctl status paradigma-api
curl -s http://127.0.0.1:8000/health
```

---

## 5. Frontend

Сборка с **`VITE_API_URL`** = публичный URL сайта **без** `/api` и **без** слэша в конце (тот же домен, что у Nginx):

```bash
cd /opt/paradigma/frontend
npm ci
VITE_API_URL=https://ВАШ_ДОМЕН npm run build
```

Проверьте, что появился `frontend/dist/`.

---

## 6. Nginx

1. Скопируйте пример и подставьте домен:

```bash
sudo cp /opt/paradigma/deploy/nginx-paradigma.conf /etc/nginx/sites-available/paradigma
sudo nano /etc/nginx/sites-available/paradigma
# Замените YOUR_DOMAIN на реальный домен (и при необходимости путь root, если не /opt/paradigma/frontend/dist)
```

2. Включите сайт:

```bash
sudo ln -sf /etc/nginx/sites-available/paradigma /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

3. **HTTPS:**

```bash
sudo certbot --nginx -d ВАШ_ДОМЕН
```

После выдачи сертификата в блоке `server` для порта 80 Certbot обычно добавит редирект на HTTPS. Убедитесь, что во **frontend** при **следующей** пересборке `VITE_API_URL` указывает на `https://...`.

---

## 7. Проверки

- Откройте в браузере `https://ВАШ_ДОМЕН` — главная SPA.
- `https://ВАШ_ДОМЕН/api/v1/...` — прокси на FastAPI (например документация может быть недоступна если роут не открыт; проверьте `/health` через Nginx или напрямую `curl http://127.0.0.1:8000/health` на сервере).
- Вход в ЛК, загрузка картинок — проверка `/uploads/`.

---

## 8. Обновление с GitHub

```bash
cd /opt/paradigma
git pull
cd backend && source .venv/bin/activate && pip install -r requirements.txt && deactivate
sudo systemctl restart paradigma-api
cd ../frontend && npm ci && VITE_API_URL=https://ВАШ_ДОМЕН npm run build
sudo systemctl reload nginx
```

---

## Файлы в `deploy/`

| Файл | Назначение |
|------|------------|
| `nginx-paradigma.conf` | Пример виртуального хоста Nginx |
| `paradigma-api.service` | Пример unit для systemd + Uvicorn |
| `DEPLOY.md` | Этот гайд |
