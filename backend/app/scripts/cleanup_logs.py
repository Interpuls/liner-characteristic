import os
from datetime import datetime, timedelta

from sqlmodel import Session, delete

from app.db import engine
from app.model.access_log import AccessLog
from app.model.audit_log import AuditLog
from app.model.login_event import LoginEvent
from app.model.security_event import SecurityEvent


def cleanup_logs(retention_days: int) -> None:
    # NB: i vostri created_at usano datetime.utcnow() (naive), quindi usiamo cutoff naive UTC
    cutoff = datetime.utcnow() - timedelta(days=retention_days)

    with Session(engine) as session:
        res_access = session.exec(
            delete(AccessLog).where(AccessLog.created_at < cutoff)
        )
        res_audit = session.exec(
            delete(AuditLog).where(AuditLog.created_at < cutoff)
        )
        res_login_events = session.exec(
            delete(LoginEvent).where(LoginEvent.created_at < cutoff)
        )
        res_security_events = session.exec(
            delete(SecurityEvent).where(SecurityEvent.created_at < cutoff)
        )
        session.commit()

    access_deleted = getattr(res_access, "rowcount", None)
    audit_deleted = getattr(res_audit, "rowcount", None)
    login_events_deleted = getattr(res_login_events, "rowcount", None)
    security_events_deleted = getattr(res_security_events, "rowcount", None)

    print(
        f"[cleanup_logs] retention_days={retention_days} cutoff={cutoff.isoformat()} "
        f"access_deleted={access_deleted} audit_deleted={audit_deleted} "
        f"login_events_deleted={login_events_deleted} security_events_deleted={security_events_deleted}"
    )


if __name__ == "__main__":
    retention_days = int(os.getenv("LOG_RETENTION_DAYS", "21"))
    cleanup_logs(retention_days)
