# Скрипты деплоя (VPS, Ubuntu, root)

| Файл | Назначение |
|------|------------|
| `01-https-certificates.sh` | Let's Encrypt через `certbot --nginx` |
| `02-frontend.sh` | `npm ci`, продакшн-сборка, проверка `dist` |
| `03-nginx.sh` | Конфиг Nginx (HTTP), проверка и reload |

## Первый деплой с нуля

**Certbot** правит конфиг Nginx и проверяет домен по **портy 80**. Поэтому порядок такой:

```bash
cd /opt/paradigma/deploy/scripts
chmod +x *.sh
sudo ./03-nginx.sh
sudo ./02-frontend.sh
sudo ./01-https-certificates.sh
```

После выпуска сертификата Certbot обычно сам включит HTTPS. Пересобери фронт с `https://` (в `.env.production` или переменная) и при необходимости:

```bash
sudo ./02-frontend.sh
sudo systemctl reload nginx
```

Переменные окружения (опционально):

```bash
export DOMAIN=paradigma-bjj.ru
export APP_DIR=/opt/paradigma
```

## Только обновление фронта

```bash
sudo ./02-frontend.sh && sudo systemctl reload nginx
```

## Продление сертификатов

```bash
certbot renew
systemctl reload nginx
```
