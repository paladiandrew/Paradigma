#!/usr/bin/env bash
# Установка конфигурации Nginx (HTTP), проверка и reload.
set -euo pipefail

DOMAIN="${DOMAIN:-paradigma-bjj.ru}"
APP_DIR="${APP_DIR:-/opt/paradigma}"
DIST="$APP_DIR/frontend/dist"

echo ">>> [03] Nginx: DOMAIN=$DOMAIN root=$DIST"

if [[ ! -f "$DIST/index.html" ]]; then
  echo "Предупреждение: нет $DIST/index.html — сначала выполни sudo ./02-frontend.sh"
  echo "Nginx всё равно будет настроен; после сборки сделай reload."
fi

apt-get update -qq
apt-get install -y nginx

cat > /etc/nginx/sites-available/paradigma << NGINX_EOF
upstream paradigma_api {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${DIST};
    index index.html;
    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://paradigma_api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
    }

    location /uploads/ {
        proxy_pass http://paradigma_api;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://paradigma_api;
        proxy_set_header Host \$host;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/paradigma /etc/nginx/sites-enabled/paradigma
rm -f /etc/nginx/sites-enabled/default

echo ">>> nginx -t"
nginx -t

echo ">>> systemctl reload nginx"
systemctl reload nginx

echo ">>> Проверки с localhost:"
curl -sS -o /dev/null -w "GET / → %{http_code}\n" http://127.0.0.1/ || true
curl -sS -o /dev/null -w "GET /health → %{http_code}\n" http://127.0.0.1/health || true

echo ">>> [03] готово. Для HTTPS затем: sudo ./01-https-certificates.sh"
