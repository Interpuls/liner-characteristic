import argparse
import csv
import json
import re
from typing import Dict, Optional

import sqlalchemy as sa
from sqlmodel import Session, select

from app.db import engine
from app.model.kpi import KpiValue, TestMetric
from app.model.product import Product, ProductApplication
from app.model.speed import SpeedRun
from app.services.kpi_engine import score_from_scales


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


def _compute_speed_kpis(session: Session, run: SpeedRun) -> None:
    if run.measure_ml is None:
        return

    context = json.dumps({"agg": "final"})

    session.exec(
        sa.delete(TestMetric).where(
            (TestMetric.run_type == "SPEED")
            & (TestMetric.run_id == run.id)
            & (TestMetric.metric_code == "SPEED_ML")
            & (TestMetric.context_json == context)
        )
    )
    session.add(
        TestMetric(
            run_type="SPEED",
            run_id=run.id,
            product_application_id=run.product_application_id,
            metric_code="SPEED_ML",
            value_num=run.measure_ml,
            unit="ml",
            context_json=context,
        )
    )

    score = score_from_scales(session, "SPEED", run.measure_ml)

    session.exec(
        sa.delete(KpiValue).where(
            (KpiValue.run_type == "SPEED")
            & (KpiValue.run_id == run.id)
            & (KpiValue.kpi_code == "SPEED")
            & (KpiValue.context_json == context)
        )
    )
    session.add(
        KpiValue(
            run_type="SPEED",
            run_id=run.id,
            product_application_id=run.product_application_id,
            kpi_code="SPEED",
            value_num=run.measure_ml,
            score=score,
            unit="ml",
            context_json=context,
        )
    )


def _load_product_map(session: Session) -> Dict[str, Product]:
    products = session.exec(
        select(Product).where(Product.product_type == "liner")
    ).all()
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Speed runs from CSV.")
    parser.add_argument("--file", required=True, help="Path to CSV file.")
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate without writing to DB.")
    parser.add_argument("--delimiter", default=";", help="CSV delimiter (default: ';').")
    args = parser.parse_args()

    created = 0
    skipped = 0
    errors = 0

    with open(args.file, newline="", encoding="utf-8-sig") as csvfile:
        reader = csv.DictReader(csvfile, delimiter=args.delimiter)
        if not reader.fieldnames:
            print("No headers found in CSV.")
            return 1
        header_map = {name: _normalize_header(name) for name in reader.fieldnames}
        rows = []
        for raw in reader:
            rows.append({header_map[k]: v for k, v in raw.items()})

    with Session(engine) as session:
        products_by_model = _load_product_map(session)
        for idx, row in enumerate(rows, start=2):
            model = (row.get("liner") or "").strip()
            size_raw = row.get("teat size") or row.get("teat length")
            speed_val = _parse_float(row.get("speed"))

            if not model or not size_raw or speed_val is None:
                skipped += 1
                print(f"Row {idx}: missing liner/teat size/speed, skipped.")
                continue

            try:
                size_mm = int(float(str(size_raw).replace(",", ".")))
            except ValueError:
                skipped += 1
                print(f"Row {idx}: invalid teat size '{size_raw}', skipped.")
                continue

            product = products_by_model.get(model)
            if not product:
                errors += 1
                print(f"Row {idx}: model '{model}' not found or duplicated.")
                continue

            app = session.exec(
                select(ProductApplication).where(
                    ProductApplication.product_id == product.id,
                    ProductApplication.size_mm == size_mm,
                )
            ).first()
            if not app:
                errors += 1
                print(f"Row {idx}: application not found for '{model}' size {size_mm}.")
                continue

            if args.dry_run:
                created += 1
                continue

            try:
                run = SpeedRun(product_application_id=app.id, measure_ml=speed_val)
                session.add(run)
                session.flush()
                _compute_speed_kpis(session, run)
                session.commit()
                created += 1
            except Exception as exc:
                session.rollback()
                errors += 1
                print(f"Row {idx}: {exc}")

    print(f"Done. Created: {created}, Skipped: {skipped}, Errors: {errors}.")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
