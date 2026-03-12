from collections import Counter
from math import atan2, cos, radians, sin, sqrt
from typing import Optional

import json
import logging
import os
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from app.services.conversion_wrapper import convert_output

from app.db import get_session
from app.auth import hash_password, verify_password, create_access_token, get_current_user, require_role
from app.model.user import User, UserRole, UnitSystem
from app.model.login_event import LoginEvent
from app.model.security_event import SecurityEvent
from app.schema.user import UserCreate, UserRead
from app.schema.auth import Token

router = APIRouter()
logger = logging.getLogger("liner-backend.auth")


ALLOWED_EMAIL_DOMAIN = "milkrite-interpuls.com"  #eventualmente da spostare in un .env ??
MAX_FAILED_LOGIN_ATTEMPTS_PER_EMAIL = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS_PER_EMAIL", "10"))
MAX_FAILED_LOGIN_ATTEMPTS_PER_IP = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS_PER_IP", "20"))
FAILED_LOGIN_WINDOW_MINUTES = int(os.getenv("FAILED_LOGIN_WINDOW_MINUTES", "10"))
LOGIN_BLOCK_MINUTES = int(os.getenv("LOGIN_BLOCK_MINUTES", str(FAILED_LOGIN_WINDOW_MINUTES)))
SUCCESS_LOCATION_WINDOW_MINUTES = int(os.getenv("SUCCESS_LOCATION_WINDOW_MINUTES", "30"))
MAX_DISTINCT_SUCCESS_LOCATIONS = int(os.getenv("MAX_DISTINCT_SUCCESS_LOCATIONS", "3"))
LOCATION_KEY_USE_CITY = os.getenv("LOCATION_KEY_USE_CITY", "0").strip().lower() in ("1", "true", "yes")
ENABLE_LOCATION_GUARD = os.getenv("ENABLE_LOCATION_GUARD", "0").strip().lower() in ("1", "true", "yes")
ENABLE_IMPOSSIBLE_TRAVEL_GUARD = os.getenv("ENABLE_IMPOSSIBLE_TRAVEL_GUARD", "0").strip().lower() in ("1", "true", "yes")
IMPOSSIBLE_TRAVEL_WINDOW_MINUTES = int(os.getenv("IMPOSSIBLE_TRAVEL_WINDOW_MINUTES", "30"))
IMPOSSIBLE_TRAVEL_DISTANCE_KM = float(os.getenv("IMPOSSIBLE_TRAVEL_DISTANCE_KM", "800"))
SECURITY_DASHBOARD_WINDOW_HOURS = int(os.getenv("SECURITY_DASHBOARD_WINDOW_HOURS", "24"))


# ---------------- AUTH ENDPOINTS ----------------

@router.post("/register", response_model=UserRead)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    #Crea un nuovo utente (registrazione).
    #Consente solo indirizzi email aziendali.
    if not payload.email.endswith(f"@{ALLOWED_EMAIL_DOMAIN}"):
        raise HTTPException(status_code=400, detail="Email domain not allowed")

    exists = session.exec(select(User).where(User.email == payload.email)).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role or UserRole.USER,
        unit_system=payload.unit_system or UnitSystem.metric,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# Helper: accetta sia JSON che form-url-encoded; legge il raw body una sola volta
async def _extract_credentials(request: Request) -> tuple[str, str]:
    ctype = (request.headers.get("content-type") or "").lower()
    username: Optional[str] = None
    password: Optional[str] = None

    # Leggi il body (cached se già consumato da middleware)
    try:
        raw = await request.body()
    except Exception:
        raw = b""
    # DEBUG TEMP: log contenuto body e headers
    try:
        import logging
        logging.getLogger("liner-backend.auth").info(
            "login: ctype=%s len(raw)=%s", ctype, len(raw)
        )
    except Exception:
        pass

    # 1) prova JSON se header indica json
    if raw and "application/json" in ctype:
        try:
            data = json.loads(raw.decode() or "{}")
        except Exception:
            data = {}
        username = data.get("username") or data.get("email")
        password = data.get("password")

    # 2) prova querystring parsing (valido per x-www-form-urlencoded)
    if raw and (not username or not password):
        try:
            from urllib.parse import parse_qs
            parsed = {k: v[0] for k, v in parse_qs(raw.decode()).items() if v}
            username = username or parsed.get("username") or parsed.get("email")
            password = password or parsed.get("password")
        except Exception:
            pass

    # 3) extrema ratio: prova anche request.form (multipart)
    if not username or not password:
        try:
            form = await request.form()
            try:
                import logging
                logging.getLogger("liner-backend.auth").info(
                    "login: form keys=%s", list(form.keys())
                )
            except Exception:
                pass
            username = username or form.get("username") or form.get("email")
            password = password or form.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing username/password",
        )
    return username, password


def _request_ip(request: Request) -> str:
    xfwd = request.headers.get("x-forwarded-for")
    if xfwd:
        return xfwd.split(",")[0].strip()
    return request.client.host if request.client else "-"


def _best_effort_geo_from_headers(request: Request) -> tuple[Optional[str], Optional[str], Optional[str], Optional[float], Optional[float]]:
    # Works with common edge proxies/CDNs (Vercel/Cloudflare/etc.) when available.
    country = request.headers.get("x-vercel-ip-country") or request.headers.get("cf-ipcountry")
    region = request.headers.get("x-vercel-ip-country-region")
    city = request.headers.get("x-vercel-ip-city")
    lat_raw = request.headers.get("x-vercel-ip-latitude")
    lon_raw = request.headers.get("x-vercel-ip-longitude")
    try:
        lat = float(lat_raw) if lat_raw else None
    except ValueError:
        lat = None
    try:
        lon = float(lon_raw) if lon_raw else None
    except ValueError:
        lon = None
    return country, region, city, lat, lon


def _location_key(country: Optional[str], region: Optional[str], city: Optional[str]) -> Optional[str]:
    if not country or not region:
        return None
    if LOCATION_KEY_USE_CITY and city:
        return f"{country.strip().upper()}|{region.strip().upper()}|{city.strip().upper()}"
    return f"{country.strip().upper()}|{region.strip().upper()}"


def _count_recent_failed_attempts_for_email(session: Session, email_attempted: str, now: datetime) -> int:
    window_start = now - timedelta(minutes=FAILED_LOGIN_WINDOW_MINUTES)
    stmt = (
        select(LoginEvent)
        .where(LoginEvent.success.is_(False))
        .where(LoginEvent.created_at >= window_start)
        .where(LoginEvent.email_attempted == email_attempted)
    )
    return len(session.exec(stmt).all())


def _count_recent_failed_attempts_for_ip(session: Session, ip: str, now: datetime) -> int:
    window_start = now - timedelta(minutes=FAILED_LOGIN_WINDOW_MINUTES)
    stmt = (
        select(LoginEvent)
        .where(LoginEvent.success.is_(False))
        .where(LoginEvent.created_at >= window_start)
        .where(LoginEvent.ip == ip)
    )
    return len(session.exec(stmt).all())


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return radius_km * c


def _register_login_event(
    session: Session,
    request: Request,
    *,
    email_attempted: str,
    user_id: Optional[int],
    success: bool,
) -> None:
    try:
        ip = _request_ip(request)
        user_agent = request.headers.get("user-agent", "")
        request_id = request.headers.get("x-request-id") or str(uuid4())
        country, region, city, lat, lon = _best_effort_geo_from_headers(request)
        logger.info(
            "LOGIN_EVENT about_to_persist email=%s success=%s user_id=%s ip=%s request_id=%s country=%s region=%s city=%s",
            email_attempted,
            success,
            user_id,
            ip,
            request_id,
            country,
            region,
            city,
        )
        session.add(
            LoginEvent(
                user_id=user_id,
                email_attempted=email_attempted,
                success=success,
                ip=ip,
                user_agent=user_agent,
                country=country,
                region=region,
                city=city,
                lat=lat,
                lon=lon,
                request_id=request_id,
                created_at=datetime.utcnow(),
            )
        )
        session.commit()
        logger.info(
            "LOGIN_EVENT persisted_ok email=%s success=%s user_id=%s request_id=%s",
            email_attempted,
            success,
            user_id,
            request_id,
        )
    except Exception:
        session.rollback()
        logger.warning("Failed to persist login event", exc_info=True)


def _register_security_event(
    session: Session,
    request: Request,
    *,
    rule_code: str,
    severity: str,
    user_id: Optional[int],
    email_attempted: Optional[str],
    details_json: Optional[dict],
) -> None:
    try:
        ip = _request_ip(request)
        request_id = request.headers.get("x-request-id") or str(uuid4())
        session.add(
            SecurityEvent(
                user_id=user_id,
                email_attempted=email_attempted,
                ip=ip,
                rule_code=rule_code,
                severity=severity,
                details_json=details_json,
                request_id=request_id,
                created_at=datetime.utcnow(),
            )
        )
        session.commit()
    except Exception:
        session.rollback()
        logger.warning("Failed to persist security event", exc_info=True)


#Effettua il login e genera un token JWT
@router.post("/login", response_model=Token)
async def login(
    request: Request,
    creds: tuple[str, str] = Depends(_extract_credentials),
    session: Session = Depends(get_session),
):
    username, password = creds
    email_attempted = username.strip().lower()
    ip = _request_ip(request)
    now = datetime.utcnow()
    user = session.exec(select(User).where(User.email == email_attempted)).first()
    is_valid_credentials = bool(user and verify_password(password, user.hashed_password))

    if not is_valid_credentials:
        failed_recent_email = _count_recent_failed_attempts_for_email(session, email_attempted, now)
        failed_recent_ip = _count_recent_failed_attempts_for_ip(session, ip, now)
        _register_login_event(
            session,
            request,
            email_attempted=email_attempted,
            user_id=getattr(user, "id", None),
            success=False,
        )
        if failed_recent_email + 1 >= MAX_FAILED_LOGIN_ATTEMPTS_PER_EMAIL:
            _register_security_event(
                session,
                request,
                rule_code="RATE_LIMIT_EMAIL",
                severity="high",
                user_id=getattr(user, "id", None),
                email_attempted=email_attempted,
                details_json={
                    "window_minutes": FAILED_LOGIN_WINDOW_MINUTES,
                    "failed_attempts": failed_recent_email + 1,
                    "threshold": MAX_FAILED_LOGIN_ATTEMPTS_PER_EMAIL,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts for this user. Retry in {LOGIN_BLOCK_MINUTES} minutes.",
            )
        if failed_recent_ip + 1 >= MAX_FAILED_LOGIN_ATTEMPTS_PER_IP:
            _register_security_event(
                session,
                request,
                rule_code="RATE_LIMIT_IP",
                severity="high",
                user_id=getattr(user, "id", None),
                email_attempted=email_attempted,
                details_json={
                    "window_minutes": FAILED_LOGIN_WINDOW_MINUTES,
                    "failed_attempts": failed_recent_ip + 1,
                    "threshold": MAX_FAILED_LOGIN_ATTEMPTS_PER_IP,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts from this IP. Retry in {LOGIN_BLOCK_MINUTES} minutes.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    country, region, city, _lat, _lon = _best_effort_geo_from_headers(request)
    current_location_key = _location_key(country, region, city)
    if ENABLE_LOCATION_GUARD and user and current_location_key:
        window_start = now - timedelta(minutes=SUCCESS_LOCATION_WINDOW_MINUTES)
        rows = session.exec(
            select(LoginEvent.country, LoginEvent.region, LoginEvent.city)
            .where(LoginEvent.user_id == user.id)
            .where(LoginEvent.success.is_(True))
            .where(LoginEvent.created_at >= window_start)
        ).all()
        distinct_locations = {
            key
            for (c, r, ci) in rows
            for key in [_location_key(c, r, ci)]
            if key is not None
        }
        distinct_locations.add(current_location_key)
        if len(distinct_locations) > MAX_DISTINCT_SUCCESS_LOCATIONS:
            _register_security_event(
                session,
                request,
                rule_code="LOCATION_ANOMALY",
                severity="medium",
                user_id=user.id,
                email_attempted=email_attempted,
                details_json={
                    "window_minutes": SUCCESS_LOCATION_WINDOW_MINUTES,
                    "distinct_locations": len(distinct_locations),
                    "threshold": MAX_DISTINCT_SUCCESS_LOCATIONS,
                    "location_key": current_location_key,
                },
            )
            _register_login_event(
                session,
                request,
                email_attempted=email_attempted,
                user_id=user.id,
                success=False,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "Suspicious login pattern detected. "
                    f"Too many different locations in {SUCCESS_LOCATION_WINDOW_MINUTES} minutes."
                ),
            )

    if ENABLE_IMPOSSIBLE_TRAVEL_GUARD and user and _lat is not None and _lon is not None:
        previous_success = session.exec(
            select(LoginEvent)
            .where(LoginEvent.user_id == user.id)
            .where(LoginEvent.success.is_(True))
            .where(LoginEvent.lat.is_not(None))
            .where(LoginEvent.lon.is_not(None))
            .order_by(LoginEvent.created_at.desc())
        ).first()
        if previous_success is not None:
            elapsed_minutes = (now - previous_success.created_at).total_seconds() / 60.0
            if elapsed_minutes <= IMPOSSIBLE_TRAVEL_WINDOW_MINUTES:
                distance_km = _haversine_km(
                    float(previous_success.lat),
                    float(previous_success.lon),
                    float(_lat),
                    float(_lon),
                )
                if distance_km >= IMPOSSIBLE_TRAVEL_DISTANCE_KM:
                    _register_security_event(
                        session,
                        request,
                        rule_code="IMPOSSIBLE_TRAVEL",
                        severity="high",
                        user_id=user.id,
                        email_attempted=email_attempted,
                        details_json={
                            "distance_km": distance_km,
                            "elapsed_minutes": elapsed_minutes,
                            "distance_threshold_km": IMPOSSIBLE_TRAVEL_DISTANCE_KM,
                            "window_minutes": IMPOSSIBLE_TRAVEL_WINDOW_MINUTES,
                        },
                    )
                    _register_login_event(
                        session,
                        request,
                        email_attempted=email_attempted,
                        user_id=user.id,
                        success=False,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Suspicious impossible travel detected. Login temporarily blocked.",
                    )

    _register_login_event(
        session,
        request,
        email_attempted=email_attempted,
        user_id=user.id,
        success=True,
    )

    role_value = getattr(user.role, "value", user.role)
    unit_pref = getattr(user, "unit_system", UnitSystem.metric)
    unit_system_value = getattr(unit_pref, "value", unit_pref) or UnitSystem.metric
    token = create_access_token(sub=user.email, role=role_value, unit_system=unit_system_value)
    return Token(access_token=token, unit_system=unit_system_value)

    
#Restituisce le informazioni dell’utente autenticato.
@router.get("/security/events")
def security_events(
    limit: int = 100,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    safe_limit = max(1, min(limit, 500))
    rows = session.exec(
        select(SecurityEvent).order_by(SecurityEvent.created_at.desc()).limit(safe_limit)
    ).all()
    return rows


@router.get("/security/summary")
def security_summary(
    hours: Optional[int] = None,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    window_hours = hours or SECURITY_DASHBOARD_WINDOW_HOURS
    window_start = datetime.utcnow() - timedelta(hours=max(1, min(window_hours, 24 * 30)))

    login_rows = session.exec(
        select(LoginEvent).where(LoginEvent.created_at >= window_start)
    ).all()
    sec_rows = session.exec(
        select(SecurityEvent).where(SecurityEvent.created_at >= window_start)
    ).all()

    total_logins = len(login_rows)
    success_count = sum(1 for r in login_rows if r.success)
    failed_count = total_logins - success_count
    blocked_count = sum(
        1
        for r in sec_rows
        if (r.rule_code or "").startswith(("RATE_LIMIT", "LOCATION_", "IMPOSSIBLE"))
    )

    by_country = Counter((r.country or "UNKNOWN") for r in login_rows if r.success)
    by_rule = Counter((r.rule_code or "UNKNOWN") for r in sec_rows)

    return {
        "window_hours": window_hours,
        "totals": {
            "login_events": total_logins,
            "success": success_count,
            "failed": failed_count,
            "security_events": len(sec_rows),
            "blocked_events": blocked_count,
        },
        "top_success_countries": by_country.most_common(10),
        "security_events_by_rule": by_rule.most_common(20),
    }


@router.get("/me", response_model=UserRead)
@convert_output
def me(user: User = Depends(get_current_user)):
    return user
