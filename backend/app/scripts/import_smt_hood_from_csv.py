import argparse
import csv
import json
import re
from typing import Dict, List, Optional, Tuple

import sqlalchemy as sa
from sqlmodel import Session, select

from app.db import engine
from app.model.kpi import KpiValue, TestMetric
from app.model.product import Product, ProductApplication
from app.model.smthood import SmtHoodRun, SmtHoodPoint
from app.services.kpi_engine import score_or_422


ALLOWED_FLOWS = [0.5, 1.9, 3.6]
MILK_VAC = 45.0
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


def _parse_flow(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    m = re.search(r"[\d.,]+", str(value))
    if not m:
        return None
    return _parse_float(m.group(0))


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
    label = raw.upper()
    return SIZE_LABELS.get(label)


def _flow_code(lpm: float) -> int:
    return int(round(lpm * 10))


def _norm_flow(lpm: float) -> float:
    return min(ALLOWED_FLOWS, key=lambda f: abs(f - float(lpm)))


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


def _compute_smt_hood_kpis(session: Session, run: SmtHoodRun) -> None:
    pts = session.exec(select(SmtHoodPoint).where(SmtHoodPoint.run_id == run.id)).all()
    by_code = {p.flow_code: p for p in pts}
    needed = [_flow_code(f) for f in ALLOWED_FLOWS]
    if not all(code in by_code for code in needed):
        raise ValueError("Run requires 3 points at flows 0.5, 1.9, 3.6 L/min")

    session.exec(sa.delete(TestMetric).where(TestMetric.run_type == "SMT_HOOD", TestMetric.run_id == run.id))

    metrics_to_save = []
    respray_vals, fluydo_vals, slippage_vals, ringing_vals = [], [], [], []

    for fl in ALLOWED_FLOWS:
        code = _flow_code(fl)
        p = by_code[code]
        smt_min, smt_max = float(p.smt_min), float(p.smt_max)
        hood_min, hood_max = float(p.hood_min), float(p.hood_max)

        respray_val = smt_max - MILK_VAC
        fluydo_val = (smt_max - smt_min) - (smt_max - MILK_VAC) if smt_max > MILK_VAC else (smt_max - smt_min)
        slippage_val = (hood_max - hood_min) - (hood_max - MILK_VAC) if hood_max > MILK_VAC else (hood_max - hood_min)
        ringing_val = hood_max - MILK_VAC

        score_or_422(session, "RESPRAY", respray_val)
        score_or_422(session, "FLUYDODINAMIC", fluydo_val)
        score_or_422(session, "SLIPPAGE", slippage_val)
        score_or_422(session, "RINGING_RISK", ringing_val)

        metrics_to_save.extend([
            TestMetric(
                run_type="SMT_HOOD", run_id=run.id, product_application_id=run.product_application_id,
                metric_code="RESPRAY_VAL", value_num=float(respray_val), unit="kPa",
                context_json=json.dumps({"flow_lpm": fl}),
            ),
            TestMetric(
                run_type="SMT_HOOD", run_id=run.id, product_application_id=run.product_application_id,
                metric_code="FLUYDODINAMIC_VAL", value_num=float(fluydo_val), unit="kPa",
                context_json=json.dumps({"flow_lpm": fl}),
            ),
            TestMetric(
                run_type="SMT_HOOD", run_id=run.id, product_application_id=run.product_application_id,
                metric_code="SLIPPAGE_VAL", value_num=float(slippage_val), unit="kPa",
                context_json=json.dumps({"flow_lpm": fl}),
            ),
            TestMetric(
                run_type="SMT_HOOD", run_id=run.id, product_application_id=run.product_application_id,
                metric_code="RINGING_VAL", value_num=float(ringing_val), unit="kPa",
                context_json=json.dumps({"flow_lpm": fl}),
            ),
        ])

        respray_vals.append(respray_val)
        fluydo_vals.append(fluydo_val)
        slippage_vals.append(slippage_val)
        ringing_vals.append(ringing_val)

    if metrics_to_save:
        session.bulk_save_objects(metrics_to_save)

    def _avg(xs: list[float]) -> float:
        return (sum(xs) / len(xs)) if xs else 0.0

    avg_respray = _avg(respray_vals)
    avg_fluydo = _avg(fluydo_vals)
    avg_slip = _avg(slippage_vals)
    avg_ringing = _avg(ringing_vals)

    def upsert_kpi(code: str, value: float) -> None:
        ctx = json.dumps({"flows": ALLOWED_FLOWS, "agg": "final"})
        score = score_or_422(session, code, value)
        kv = session.exec(
            select(KpiValue).where(
                KpiValue.product_application_id == run.product_application_id,
                KpiValue.kpi_code == code,
            )
        ).first()
        if kv:
            kv.value_num, kv.score, kv.unit = float(value), int(score), "kPa"
            kv.run_type, kv.run_id, kv.context_json = "SMT_HOOD", run.id, ctx
            session.add(kv)
        else:
            session.add(
                KpiValue(
                    product_application_id=run.product_application_id,
                    kpi_code=code,
                    value_num=float(value),
                    score=int(score),
                    run_type="SMT_HOOD",
                    run_id=run.id,
                    unit="kPa",
                    context_json=ctx,
                )
            )

    upsert_kpi("RESPRAY", avg_respray)
    upsert_kpi("FLUYDODINAMIC", avg_fluydo)
    upsert_kpi("SLIPPAGE", avg_slip)
    upsert_kpi("RINGING_RISK", avg_ringing)


def main() -> int:
    parser = argparse.ArgumentParser(description="Import SMT/Hood runs from CSV.")
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
            size_mm = _parse_size_mm(row.get("teat size__2")) or _parse_size_mm(row.get("teat size"))
            flow_lpm = _parse_flow(row.get("water flow rate (lit./min.)"))
            smt_min = _parse_float(row.get("smt-min 1"))
            smt_max = _parse_float(row.get("smt-max 1"))
            hood_min = _parse_float(row.get("hood-min 1"))
            hood_max = _parse_float(row.get("hood-max 1"))

            if not model or size_mm is None or flow_lpm is None:
                skipped += 1
                print(f"Row {idx}: missing liner/teat size/flow, skipped.")
                continue
            if smt_min is None or smt_max is None or hood_min is None or hood_max is None:
                skipped += 1
                print(f"Row {idx}: missing SMT/HOOD values, skipped.")
                continue

            fl = _norm_flow(flow_lpm)
            if fl not in ALLOWED_FLOWS:
                skipped += 1
                print(f"Row {idx}: flow {flow_lpm} not allowed, skipped.")
                continue
            if smt_max < smt_min or hood_max < hood_min:
                errors += 1
                print(f"Row {idx}: max must be >= min for SMT and HOOD.")
                continue

            key = (model, size_mm)
            grouped.setdefault(key, {})[_flow_code(fl)] = {
                "flow_lpm": fl,
                "smt_min": smt_min,
                "smt_max": smt_max,
                "hood_min": hood_min,
                "hood_max": hood_max,
            }

        for (model, size_mm), points_by_flow in grouped.items():
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

            if not all(_flow_code(f) in points_by_flow for f in ALLOWED_FLOWS):
                errors += 1
                print(f"Missing flow points for '{model}' size {size_mm}.")
                continue

            if args.dry_run:
                created += 1
                continue

            try:
                run = SmtHoodRun(product_application_id=app.id)
                session.add(run)
                session.flush()

                pts = [
                    SmtHoodPoint(
                        run_id=run.id,
                        flow_code=code,
                        flow_lpm=vals["flow_lpm"],
                        smt_min=vals["smt_min"],
                        smt_max=vals["smt_max"],
                        hood_min=vals["hood_min"],
                        hood_max=vals["hood_max"],
                    )
                    for code, vals in points_by_flow.items()
                ]
                if pts:
                    session.bulk_save_objects(pts)
                session.flush()

                _compute_smt_hood_kpis(session, run)
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
