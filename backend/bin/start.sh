#!/usr/bin/env bash
set -e

echo "==> Applying Alembic migrations..."
python -m alembic upgrade heads

echo "==> Starting FastAPI with Uvicorn..."
exec python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --proxy-headers \
  --forwarded-allow-ips="*" \
  --log-config /app/logging.json \
  --access-log
