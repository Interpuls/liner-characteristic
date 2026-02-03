#!/usr/bin/env bash
set -euo pipefail

# Restore test of the latest backup into a temporary container.
# This does NOT touch production data.

BACKUP_DIR="${BACKUP_DIR:-/var/backups/linerdb}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:15-alpine}"
POSTGRES_USER="${POSTGRES_USER:-liner}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-linerpass}"
POSTGRES_DB="${POSTGRES_DB:-linerdb}"
TEST_CONTAINER="${TEST_CONTAINER:-liner-db-restore-test}"

latest_backup="$(ls -t "${BACKUP_DIR}"/linerdb_*.sql.gz 2>/dev/null | head -n 1 || true)"
if [[ -z "${latest_backup}" ]]; then
  echo "No backup files found in ${BACKUP_DIR}"
  exit 1
fi

echo "Using backup: ${latest_backup}"

# Start a temporary postgres container
docker run -d --rm --name "$TEST_CONTAINER" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -e POSTGRES_DB="$POSTGRES_DB" \
  "$POSTGRES_IMAGE" >/dev/null

# Wait for readiness
for i in {1..30}; do
  if docker exec "$TEST_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Restoring backup..."
gzip -dc "$latest_backup" | docker exec -i "$TEST_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null

echo "Running sanity check..."
docker exec "$TEST_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" >/dev/null

echo "Restore test completed successfully"
docker stop "$TEST_CONTAINER" >/dev/null
