#!/usr/bin/env bash
# Выпуск / обновление HTTPS (Certbot + плагин nginx).
# Нужен уже работающий Nginx с server_name для DOMAIN на порту 80 (см. 03-nginx.sh).
set -euo pipefail

DOMAIN="${DOMAIN:-paradigma-bjj.ru}"

echo ">>> [01] HTTPS: домен=$DOMAIN"
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx

if [[ ! -L /etc/nginx/sites-enabled/paradigma ]] && [[ ! -f /etc/nginx/sites-enabled/paradigma ]]; then
  echo "Ошибка: нет включённого сайта paradigma в Nginx."
  echo "Сначала выполните: sudo ./03-nginx.sh"
  exit 1
fi

if ! nginx -t 2>/dev/null; then
  echo "Ошибка: nginx -t не проходит. Исправь конфиг и повтори."
  nginx -t
  exit 1
fi

echo ">>> Запуск certbot (интерактивно: email, согласие с ToS при первом запуске)"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN"

echo ">>> Проверка HTTPS (локально, без проверки сертификата браузером):"
curl -sS -o /dev/null -w "https://127.0.0.1/ → код %{http_code}\n" -k --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/health" || true

echo ">>> [01] готово. При необходимости: sudo systemctl reload nginx"
