import argparse
import csv
import json
import re
from typing import Dict, List, Optional, Tuple

import sqlalchemy as sa
from sqlmodel import Session, select, delete

from app.db import engine
from app.model.kpi import KpiValue, TestMetric
from app.model.product import Product, ProductApplication
from app.model.massage import MassageRun, MassagePoint
from app.services.kpi_engine import score_or_422


PRESSURES = [45, 40, 35]
SIZE_LABELS = {"XS": 40, "S": 50, "M": 60, "L": 70}


def _normalize_header(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _parse_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    raw = raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def _parse_pressure(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    m = re.search(r"[\d.,]+", str(value))
    if not m:
        return None
    val = _parse_float(m.group(0))
    if val is None:
        return None
    return int(round(val))


def _parse_size_mm(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    num = _parse_float(raw)
    if num is not None:
        try:
            return int(round(num))
        except ValueError:
            return None
    return SIZE_LABELS.get(raw.upper())


def _load_product_map(session: Session) -> Dict[str, Product]:
    products = session.exec(select(Product).where(Product.product_type == "liner")).all()
    by_model: Dict[str, Product] = {}
    duplicates = set()
    for p in products:
        key = (p.model or "").strip()
        if not key:
            continue
        if key in by_model:
            duplicates.add(key)
        else:
            by_model[key] = p
    for dup in sorted(duplicates):
        by_model.pop(dup, None)
    if duplicates:
        print(f"Warning: duplicate models found, skipped: {', '.join(sorted(duplicates))}")
    return by_model


def _read_rows(path: str, delimiter: str) -> List[Dict[str, str]]:
    with open(path, newline="", encoding="utf-8-sig") as csvfile:
        reader = csv.reader(csvfile, delimiter=delimiter)
        try:
            headers = next(reader)
        except StopIteration:
            return []

        normalized = [_normalize_header(h) for h in headers]
        seen: Dict[str, int] = {}
        final_headers = []
        for h in normalized:
            count = seen.get(h, 0)
            if count == 0:
                final_headers.append(h)
            else:
                final_headers.append(f"{h}__{count + 1}")
            seen[h] = count + 1

        rows = []
        for row in reader:
            if len(row) < len(final_headers):
                row = row + [""] * (len(final_headers) - len(row))
            rows.append({final_headers[i]: row[i] for i in range(len(final_headers))})
        return rows


def _compute_massage_kpis(session: Session, run: MassageRun) -> None:
    pts = session.exec(select(MassagePoint).where(MassagePoint.run_id == run.id)).all()
    by = {p.pressure_kpa: p for p in pts}
    if not all(k in by for k in PRESSURES):
        raise ValueError("Run requires 3 points at 45/40/35 kPa")

    I45 = by[45].max_val - by[45].min_val
    I40 = by[40].max_val - by[40].min_val
    I35 = by[35].max_val - by[35].min_val

    avg_overmilk = (I45 + I40) / 2.0
    avg_pf = (I40 + I35) / 2.0
    diff_from_max = 45.0 - by[45].max_val
    diff_pct = (diff_from_max / 45.0) if 45.0 != 0 else 0.0
    drop_45_to_40 = (I40 - I45) / I45 if I45 else 0.0
    drop_40_to_35 = (I35 - I40) / I40 if I40 else 0.0

    k_cong = score_or_422(session, "CONGESTION_RISK", avg_overmilk)
    k_hk = score_or_422(session, "HYPERKERATOSIS_RISK", avg_overmilk)
    k_fit = score_or_422(session, "FITTING", diff_pct)

    session.exec(delete(TestMetric).where(TestMetric.run_type == "MASSAGE", TestMetric.run_id == run.id))

    metrics = [
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="I45", value_num=float(I45), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="I40", value_num=float(I40), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="I35", value_num=float(I35), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="AVG_OVERMILK", value_num=float(avg_overmilk), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="AVG_PF", value_num=float(avg_pf), unit=None, context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="DIFF_FROM_MAX", value_num=float(diff_from_max), unit="kPa", context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="DIFF_PCT", value_num=float(diff_pct), unit="%", context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="DROP_45_40", value_num=float(drop_45_to_40), unit="%", context_json=json.dumps({})),
        TestMetric(run_type="MASSAGE", run_id=run.id, product_application_id=run.product_application_id,
                   metric_code="DROP_40_35", value_num=float(drop_40_to_35), unit="%", context_json=json.dumps({})),
    ]
    session.bulk_save_objects(metrics)

    def upsert_kpi(code: str, value: float, score: int | None) -> None:
        ctx = json.dumps({"pressures": [45, 40, 35]})
        kv = session.exec(
            select(KpiValue).where(
                KpiValue.product_application_id == run.product_application_id,
                KpiValue.kpi_code == code,
            )
        ).first()
        if kv:
            kv.value_num = float(value)
            kv.score = int(score) if score is not None else None
            kv.run_type = "MASSAGE"
            kv.run_id = run.id
            kv.context_json = ctx
            session.add(kv)
        else:
            session.add(
                KpiValue(
                    product_application_id=run.product_application_id,
                    kpi_code=code,
                    value_num=float(value),
                    score=int(score) if score is not None else None,
                    run_type="MASSAGE",
                    run_id=run.id,
                    context_json=ctx,
                )
            )

    upsert_kpi("CONGESTION_RISK", avg_overmilk, k_cong)
    upsert_kpi("HYPERKERATOSIS_RISK", avg_overmilk, k_hk)
    upsert_kpi("FITTING", diff_pct, k_fit)


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Massage runs from CSV.")
    parser.add_argument("--file", required=True, help="Path to CSV file.")
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate without writing to DB.")
    parser.add_argument("--delimiter", default=";", help="CSV delimiter (default: ';').")
    args = parser.parse_args()

    created = 0
    skipped = 0
    errors = 0

    rows = _read_rows(args.file, args.delimiter)
    if not rows:
        print("No rows found in CSV.")
        return 1

    with Session(engine) as session:
        products_by_model = _load_product_map(session)
        grouped: Dict[Tuple[str, int], Dict[int, Dict[str, float]]] = {}

        for idx, row in enumerate(rows, start=2):
            model = (row.get("liner") or "").strip()
            size_mm = _parse_size_mm(row.get("teat length")) or _parse_size_mm(row.get("teat size"))
            pressure = _parse_pressure(row.get("vacuum inside liner"))
            min_val = _parse_float(row.get("min 1"))
            max_val = _parse_float(row.get("max 1"))

            if not model or size_mm is None or pressure is None:
                skipped += 1
                print(f"Row {idx}: missing liner/teat size/pressure, skipped.")
                continue
            if min_val is None or max_val is None:
                skipped += 1
                print(f"Row {idx}: missing min/max values, skipped.")
                continue

            pressure = int(round(pressure))
            if pressure not in PRESSURES:
                skipped += 1
                print(f"Row {idx}: pressure {pressure} not allowed, skipped.")
                continue
            if max_val < min_val:
                errors += 1
                print(f"Row {idx}: max must be >= min.")
                continue

            key = (model, size_mm)
            grouped.setdefault(key, {})[pressure] = {"min_val": min_val, "max_val": max_val}

        for (model, size_mm), points_by_pressure in grouped.items():
            product = products_by_model.get(model)
            if not product:
                errors += 1
                print(f"Model '{model}' not found or duplicated.")
                continue

            app = session.exec(
                select(ProductApplication).where(
                    ProductApplication.product_id == product.id,
                    ProductApplication.size_mm == size_mm,
                )
            ).first()
            if not app:
                errors += 1
                print(f"Application not found for '{model}' size {size_mm}.")
                continue

            if not all(p in points_by_pressure for p in PRESSURES):
                errors += 1
                print(f"Missing pressure points for '{model}' size {size_mm}.")
                continue

            if args.dry_run:
                created += 1
                continue

            try:
                run = MassageRun(product_application_id=app.id)
                session.add(run)
                session.flush()

                pts = [
                    MassagePoint(
                        run_id=run.id,
                        pressure_kpa=pressure,
                        min_val=vals["min_val"],
                        max_val=vals["max_val"],
                    )
                    for pressure, vals in points_by_pressure.items()
                ]
                if pts:
                    session.bulk_save_objects(pts)
                session.flush()

                _compute_massage_kpis(session, run)
                session.commit()
                created += 1
            except Exception as exc:
                session.rollback()
                errors += 1
                print(f"Run for '{model}' size {size_mm}: {exc}")

    print(f"Done. Created: {created}, Skipped: {skipped}, Errors: {errors}.")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
