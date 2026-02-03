#!/usr/bin/env bash
set -euo pipefail

# Weekly PostgreSQL backup using docker exec into the running DB container.
# Defaults are aligned to docker-compose.yml but can be overridden via env vars.

BACKUP_DIR="${BACKUP_DIR:-/var/backups/linerdb}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-liner-db}"
POSTGRES_DB="${POSTGRES_DB:-linerdb}"
POSTGRES_USER="${POSTGRES_USER:-liner}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-linerpass}"
POSTGRES_HOST="${POSTGRES_HOST:-}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:15-alpine}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%F_%H-%M-%S)"
backup_file="${BACKUP_DIR}/linerdb_${timestamp}.sql.gz"

echo "Starting backup to ${backup_file}"
if [[ -n "$POSTGRES_HOST" ]]; then
  PGPASSWORD="$POSTGRES_PASSWORD" docker run --rm "$POSTGRES_IMAGE" \
    pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip -c > "$backup_file"
else
  docker exec -t "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip -c > "$backup_file"
fi
echo "Backup completed"

# Retention cleanup
find "$BACKUP_DIR" -type f -name "linerdb_*.sql.gz" -mtime +"$BACKUP_KEEP_DAYS" -print -delete
echo "Retention cleanup completed"
