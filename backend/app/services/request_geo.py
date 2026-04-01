import ipaddress
import os
from functools import lru_cache
from typing import Optional

from fastapi import Request

try:
    import geoip2.database
except ImportError:  # pragma: no cover - optional dependency at runtime
    geoip2 = None
else:  # pragma: no cover - keeps attribute access simple below
    geoip2 = geoip2.database


def first_header(request: Request, *names: str) -> Optional[str]:
    for name in names:
        value = request.headers.get(name)
        if value:
            return value.strip()
    return None


def request_ip(request: Request) -> str:
    forwarded = first_header(request, "x-forwarded-for", "x-real-ip", "fly-client-ip")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "-"


def _header_geo_source(request: Request) -> Optional[str]:
    if request.headers.get("x-vercel-ip-country") or request.headers.get("x-vercel-ip-country-region"):
        return "vercel"
    if request.headers.get("cf-ipcountry"):
        return "cloudflare"
    if request.headers.get("cloudfront-viewer-country"):
        return "cloudfront"
    return "generic-proxy"


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return addr.is_global


@lru_cache(maxsize=1)
def _geoip_reader(db_path: str):
    if not db_path or not os.path.exists(db_path) or geoip2 is None:
        return None
    try:
        return geoip2.Reader(db_path)
    except Exception:
        return None


def _geoip_lookup(ip: str) -> tuple[Optional[str], Optional[str], Optional[str], Optional[float], Optional[float], Optional[str]]:
    db_path = (os.getenv("GEOIP2_CITY_DB_PATH") or "").strip()
    if not db_path or not _is_public_ip(ip):
        return None, None, None, None, None, None

    reader = _geoip_reader(db_path)
    if reader is None:
        return None, None, None, None, None, None

    try:
        result = reader.city(ip)
    except Exception:
        return None, None, None, None, None, None

    subdivision = result.subdivisions.most_specific if result.subdivisions else None
    region = subdivision.iso_code or subdivision.name if subdivision else None
    return (
        result.country.iso_code or result.registered_country.iso_code,
        region,
        result.city.name,
        result.location.latitude,
        result.location.longitude,
        "geoip2-db",
    )


def best_effort_geo_from_headers(
    request: Request,
) -> tuple[Optional[str], Optional[str], Optional[str], Optional[float], Optional[float], Optional[str]]:
    country = first_header(
        request,
        "x-vercel-ip-country",
        "cf-ipcountry",
        "cloudfront-viewer-country",
        "x-country-code",
        "x-country",
    )
    region = first_header(
        request,
        "x-vercel-ip-country-region",
        "cloudfront-viewer-country-region",
        "x-region",
        "x-country-region",
    )
    city = first_header(
        request,
        "x-vercel-ip-city",
        "cloudfront-viewer-city",
        "x-city",
    )
    lat_raw = first_header(
        request,
        "x-vercel-ip-latitude",
        "cloudfront-viewer-latitude",
        "x-latitude",
    )
    lon_raw = first_header(
        request,
        "x-vercel-ip-longitude",
        "cloudfront-viewer-longitude",
        "x-longitude",
    )

    try:
        lat = float(lat_raw) if lat_raw else None
    except ValueError:
        lat = None

    try:
        lon = float(lon_raw) if lon_raw else None
    except ValueError:
        lon = None

    if country or region or city or lat is not None or lon is not None:
        return country, region, city, lat, lon, _header_geo_source(request)

    return _geoip_lookup(request_ip(request))
