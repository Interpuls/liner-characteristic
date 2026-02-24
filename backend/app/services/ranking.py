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


def _size_label(mm: int) -> str:
    rev = {v: k for k, v in TEAT_SIZE_MAP.items()}
    return rev.get(mm, str(mm))


def get_overview_rankings(
    session: Session,
    user,
    kpis: str,
    teat_sizes: str,
    limit: int,
) -> dict:
    kpi_codes = [c.strip().upper() for c in kpis.split(",") if c.strip()]
    size_keys = [s.strip().upper() for s in teat_sizes.split(",") if s.strip()]
    size_mms = [TEAT_SIZE_MAP[s] for s in size_keys if s in TEAT_SIZE_MAP]

    if not kpi_codes:
        raise HTTPException(status_code=422, detail="kpis cannot be empty")
    if not size_mms:
        raise HTTPException(status_code=422, detail="teat_sizes cannot be empty")

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
                    latest.c.score.desc(),
                    sa.case(
                        (
                            sa.func.upper(sa.func.coalesce(prod.c.brand, "")) == "MI",
                            0,
                        ),
                        else_=1,
                    ).asc(),
                    latest.c.computed_at.desc(),
                    latest.c.value_num.desc(),
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
        },
        "items": items,
    }
