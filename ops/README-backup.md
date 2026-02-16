# Database Backup & Restore Test (Weekly)

This folder contains operational scripts for PostgreSQL backups and restore tests.

## Weekly backup (recommended)
Use cron on the server host to run the backup every week (example: Sunday at 02:30).

```bash
30 2 * * 0 /bin/bash /opt/liner/ops/db_backup.sh >> /var/log/liner-db-backup.log 2>&1
```

Environment variables supported by `db_backup.sh`:
- `BACKUP_DIR` (default `/var/backups/linerdb`)
- `POSTGRES_CONTAINER` (default `liner-db`)
- `POSTGRES_DB` (default `linerdb`)
- `POSTGRES_USER` (default `liner`)
- `POSTGRES_PASSWORD` (default `linerpass`)
- `POSTGRES_HOST` (default empty; when set uses direct host connection)
- `POSTGRES_PORT` (default `5432`)
- `POSTGRES_IMAGE` (default `postgres:15-alpine`)
- `BACKUP_KEEP_DAYS` (default `30`)

## Restore test (weekly or monthly)
Run a restore test into a temporary container to validate backups.

```bash
/bin/bash /opt/liner/ops/db_restore_test.sh >> /var/log/liner-db-restore-test.log 2>&1
```

Environment variables supported by `db_restore_test.sh`:
- `BACKUP_DIR` (default `/var/backups/linerdb`)
- `POSTGRES_IMAGE` (default `postgres:15-alpine`)
- `POSTGRES_USER` (default `liner`)
- `POSTGRES_PASSWORD` (default `linerpass`)
- `POSTGRES_DB` (default `linerdb`)
- `TEST_CONTAINER` (default `liner-db-restore-test`)

## Notes
- The restore test runs in a temporary container and does not touch production data.
- Consider copying backups to external storage (Storage Box or S3 compatible).
- Ensure scripts are executable on the server (`chmod +x /opt/liner/ops/db_backup.sh /opt/liner/ops/db_restore_test.sh`).
