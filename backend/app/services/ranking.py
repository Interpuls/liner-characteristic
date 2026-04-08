import sqlalchemy as sa
from fastapi import HTTPException
from sqlmodel import Session

from app.model.kpi import KpiValue
from app.model.product import Product, ProductApplication


TEAT_SIZE_MAP = {
    "XS": 40,
    "S": 50,
    "M": 60,
    "L": 70,
}

HIGHER_IS_BETTER_KPIS = {"SPEED", "CONGESTION_RISK", "CLOSURE"}
REFERENCE_AREAS = {
    "global": "Global",
    "north america": "North America",
    "south america": "South America",
    "europe": "Europe",
    "africa": "Africa",
    "china": "China",
    "middle east": "Middle East",
    "far east": "Far East",
    "oceania": "Oceania",
}


def _size_label(mm: int) -> str:
    rev = {v: k for k, v in TEAT_SIZE_MAP.items()}
    return rev.get(mm, str(mm))


def get_overview_rankings(
    session: Session,
    user,
    kpis: str,
    teat_sizes: str,
    reference_areas: str,
    limit: int,
) -> dict:
    kpi_codes = [c.strip().upper() for c in kpis.split(",") if c.strip()]
    size_keys = [s.strip().upper() for s in teat_sizes.split(",") if s.strip()]
    size_mms = [TEAT_SIZE_MAP[s] for s in size_keys if s in TEAT_SIZE_MAP]
    area_tokens = [s.strip().lower() for s in reference_areas.split(",") if s.strip()]
    area_values = [REFERENCE_AREAS[s] for s in area_tokens if s in REFERENCE_AREAS]

    if not kpi_codes:
        raise HTTPException(status_code=422, detail="kpis cannot be empty")
    if not size_mms:
        raise HTTPException(status_code=422, detail="teat_sizes cannot be empty")
    if not area_values:
        raise HTTPException(status_code=422, detail="reference_areas cannot be empty")

    kv = KpiValue.__table__
    pa = ProductApplication.__table__
    prod = Product.__table__

    latest = (
        sa.select(
            kv.c.product_application_id.label("product_application_id"),
            kv.c.kpi_code.label("kpi_code"),
            kv.c.score.label("score"),
            kv.c.value_num.label("value_num"),
            kv.c.computed_at.label("computed_at"),
            sa.func.row_number()
            .over(
                partition_by=(kv.c.product_application_id, kv.c.kpi_code),
                order_by=kv.c.computed_at.desc(),
            )
            .label("rn_latest"),
        )
        .where(kv.c.kpi_code.in_(kpi_codes))
        .subquery("latest")
    )

    ranking = (
        sa.select(
            pa.c.size_mm.label("size_mm"),
            latest.c.kpi_code.label("kpi_code"),
            prod.c.brand.label("brand"),
            prod.c.model.label("model"),
            latest.c.score.label("score"),
            latest.c.value_num.label("value_num"),
            latest.c.computed_at.label("computed_at"),
            sa.func.row_number()
            .over(
                partition_by=(pa.c.size_mm, latest.c.kpi_code),
                order_by=(
                    sa.func.coalesce(latest.c.score, 0).desc(),
                    sa.case(
                        (latest.c.kpi_code.in_(HIGHER_IS_BETTER_KPIS), sa.func.coalesce(latest.c.value_num, -1e12)),
                        else_=-sa.func.coalesce(latest.c.value_num, 1e12),
                    ).desc(),
                    sa.case(
                        (
                            sa.func.upper(sa.func.coalesce(prod.c.brand, "")) == "MI",
                            0,
                        ),
                        else_=1,
                    ).asc(),
                    latest.c.computed_at.desc(),
                    prod.c.model.asc(),
                ),
            )
            .label("rank_pos"),
        )
        .select_from(latest)
        .join(pa, pa.c.id == latest.c.product_application_id)
        .join(prod, prod.c.id == pa.c.product_id)
        .where(
            latest.c.rn_latest == 1,
            pa.c.size_mm.in_(size_mms),
            prod.c.product_type == "liner",
        )
    )

    role_value = getattr(getattr(user, "role", None), "value", getattr(user, "role", None))
    if role_value != "admin":
        ranking = ranking.where(prod.c.only_admin.is_(False))
    if "Global" not in area_values:
        area_matchers = [
            sa.func.lower(sa.cast(prod.c.reference_areas, sa.String)).like(f'%"{area.lower()}"%')
            for area in area_values
        ]
        ranking = ranking.where(sa.or_(*area_matchers))

    ranked = ranking.subquery("ranked")
    query = (
        sa.select(ranked)
        .where(ranked.c.rank_pos <= limit)
        .order_by(ranked.c.size_mm.asc(), ranked.c.kpi_code.asc(), ranked.c.rank_pos.asc())
    )

    rows = session.exec(query).all()

    grouped = {}
    for r in rows:
        size_mm = int(r.size_mm)
        kpi_code = str(r.kpi_code)
        grouped.setdefault(size_mm, {})
        grouped[size_mm].setdefault(kpi_code, [])
        grouped[size_mm][kpi_code].append(
            {
                "rank": int(r.rank_pos),
                "brand": r.brand or "",
                "model": r.model or "",
            }
        )

    items = []
    for size_mm in sorted(size_mms):
        kpi_items = []
        for code in kpi_codes:
            kpi_items.append(
                {
                    "kpi_code": code,
                    "top": grouped.get(size_mm, {}).get(code, []),
                }
            )
        items.append(
            {
                "teat_size": _size_label(size_mm),
                "size_mm": size_mm,
                "kpis": kpi_items,
            }
        )

    return {
        "meta": {
            "limit": limit,
            "kpis": kpi_codes,
            "teat_sizes": size_keys,
            "reference_areas": area_values,
        },
        "items": items,
    }
