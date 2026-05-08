#!/usr/bin/env bash
# Зависимости и продакшн-сборка фронтенда.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/paradigma}"
DOMAIN="${DOMAIN:-paradigma-bjj.ru}"
FRONT_DIR="$APP_DIR/frontend"
API_URL="${VITE_API_URL:-https://${DOMAIN}}"

echo ">>> [02] Frontend: APP_DIR=$FRONT_DIR VITE_API_URL=$API_URL"

if [[ ! -f "$FRONT_DIR/package.json" ]]; then
  echo "Ошибка: нет $FRONT_DIR/package.json"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo ">>> Установка Node.js 20 (NodeSource)..."
  apt-get update -qq
  apt-get install -y curl ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

cd "$FRONT_DIR"
echo ">>> npm ci"
npm ci

echo ">>> npm run build (VITE_API_URL=$API_URL)"
VITE_API_URL="$API_URL" npm run build

echo ">>> Проверка артефактов:"
if [[ ! -f dist/index.html ]]; then
  echo "Ошибка: нет dist/index.html после сборки"
  exit 1
fi
ls -la dist/index.html
echo "Размер dist:" && du -sh dist

echo ">>> [02] готово. Далее: sudo systemctl reload nginx (если уже настроен)"
