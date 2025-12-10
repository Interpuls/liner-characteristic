#!/usr/bin/env bash
set -e

echo "==> Applying Alembic migrations..."
python -m alembic upgrade head

echo "==> Starting FastAPI with Uvicorn..."
exec python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --proxy-headers \
  --log-level debug \
  --access-log