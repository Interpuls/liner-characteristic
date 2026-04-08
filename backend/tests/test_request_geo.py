from starlette.requests import Request

from app.services import request_geo


def build_request(headers=None, client=("203.0.113.10", 12345)):
    raw_headers = [
        (k.lower().encode("latin-1"), v.encode("latin-1"))
        for k, v in (headers or {}).items()
    ]
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": raw_headers,
        "client": client,
    }
    return Request(scope)


def test_best_effort_geo_prefers_proxy_headers(monkeypatch):
    req = build_request(
        headers={
            "x-vercel-ip-country": "IT",
            "x-vercel-ip-country-region": "25",
            "x-vercel-ip-city": "Milan",
            "x-vercel-ip-latitude": "45.4642",
            "x-vercel-ip-longitude": "9.19",
        }
    )

    monkeypatch.setattr(
        request_geo,
        "_geoip_lookup",
        lambda ip: ("US", "CA", "Los Angeles", 34.0, -118.0, "geoip2-db"),
    )

    assert request_geo.best_effort_geo_from_headers(req) == (
        "IT",
        "25",
        "Milan",
        45.4642,
        9.19,
        "vercel",
    )


def test_best_effort_geo_falls_back_to_geoip_when_headers_missing(monkeypatch):
    req = build_request(client=("8.8.8.8", 12345))

    monkeypatch.setattr(
        request_geo,
        "_geoip_lookup",
        lambda ip: ("US", "CA", "Mountain View", 37.4056, -122.0775, "geoip2-db"),
    )

    assert request_geo.best_effort_geo_from_headers(req) == (
        "US",
        "CA",
        "Mountain View",
        37.4056,
        -122.0775,
        "geoip2-db",
    )
