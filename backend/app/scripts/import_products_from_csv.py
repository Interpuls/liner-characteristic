import argparse
import csv
import re
from typing import Dict, List, Optional

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.db import engine
from app.model.product import Product, ProductApplication
from app.schema.product import SIZE_LABELS


def _norm_compound(value: Optional[str]) -> str:
    return (value or "STD").strip().upper() or "STD"


def _slugify(value: str) -> str:
    s = (value or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "product"


def _is_truthy(value: Optional[str]) -> bool:
    if value is None:
        return False
    v = str(value).strip().lower()
    return v in ("x", "1", "yes", "true", "y")


def _normalize_header(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


REFERENCE_AREA_MAP = {
    "global": "Global",
    "n america": "North America",
    "north america": "North America",
    "s america": "South America",
    "south america": "South America",
    "eu": "Europe",
    "europe": "Europe",
    "afri": "Africa",
    "africa": "Africa",
    "ch": "China",
    "china": "China",
    "middle east": "Middle East",
    "far east": "Far East",
    "oceania": "Oceania",
}


def _parse_reference_areas(row: Dict[str, str]) -> Optional[List[str]]:
    areas = []
    for col, area in REFERENCE_AREA_MAP.items():
        if _is_truthy(row.get(col)):
            areas.append(area)
    if "Global" in areas:
        return ["Global"]
    return areas or None


def _map_barrel_shape(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    v = str(value).strip().lower()
    if not v:
        return None
    if v.startswith("tri"):
        return "triangular"
    if v.startswith("squ"):
        return "squared"
    if v.startswith("rou") or v.startswith("round"):
        return "round"
    return None


def _is_robot_liner(value: Optional[str]) -> bool:
    if value is None:
        return False
    v = str(value).strip().lower()
    return "robot" in v


def _build_product_payload(row: Dict[str, str]) -> Optional[Dict[str, object]]:
    model = (row.get("liner") or "").strip()
    brand = (row.get("brand") or "").strip()
    if not model or not brand:
        return None

    compound = _norm_compound(row.get("compound"))
    only_admin = not _is_truthy(row.get("visible to users"))
    robot_liner = _is_robot_liner(row.get("parlour type") or row.get("parlor type"))
    barrel_shape = _map_barrel_shape(row.get("barrel shape"))
    reference_areas = _parse_reference_areas(row)

    return {
        "brand": brand,
        "model": model,
        "compound": compound,
        "only_admin": only_admin,
        "robot_liner": robot_liner,
        "barrel_shape": barrel_shape,
        "reference_areas": reference_areas,
    }


def _create_product_like_admin(session: Session, payload: Dict[str, object]) -> Product:
    brand = (payload.get("brand") or "").strip()
    model = (payload.get("model") or "").strip()
    compound = _norm_compound(payload.get("compound"))
    only_admin = bool(payload.get("only_admin"))

    if not only_admin:
        session.exec(
            Product.__table__.update()
            .where(
                Product.brand == brand,
                Product.model == model,
                Product.only_admin == False,
            )
            .values(only_admin=True)
        )

    base_code = _slugify(f"{brand}-{model}-{compound}")
    suffix = 0
    max_tries = 50

    while True:
        code = base_code if suffix == 0 else f"{base_code}-{suffix}"
        data = dict(payload)
        data.update(
            {
                "code": code,
                "name": payload.get("name") or model or code,
                "product_type": "liner",
                "brand": brand,
                "model": model,
                "compound": compound,
                "only_admin": only_admin,
            }
        )
        obj = Product(**data)
        session.add(obj)
        try:
            session.flush()
        except IntegrityError as exc:
            session.rollback()
            msg = str(getattr(exc, "orig", exc))
            if "ux_products_code" in msg:
                suffix += 1
                if suffix > max_tries:
                    raise RuntimeError("Could not generate a unique product code")
                continue
            if "ux_products_brand_model_compound" in msg:
                raise RuntimeError("Product with same brand, model and compound already exists")
            raise RuntimeError("Could not create product")

        apps = [
            ProductApplication(
                product_id=obj.id,
                size_mm=size,
                label=SIZE_LABELS[size],
            )
            for size in (40, 50, 60, 70)
        ]
        session.bulk_save_objects(apps)
        session.commit()
        return obj


def main() -> int:
    parser = argparse.ArgumentParser(description="Import products from CSV (exported from Excel).")
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
            row = {header_map[k]: v for k, v in raw.items()}
            rows.append(row)

    with Session(engine) as session:
        for idx, row in enumerate(rows, start=2):
            payload = _build_product_payload(row)
            if not payload:
                skipped += 1
                print(f"Row {idx}: missing Liner or Brand, skipped.")
                continue

            if args.dry_run:
                created += 1
                continue

            try:
                _create_product_like_admin(session, payload)
                created += 1
            except Exception as exc:
                errors += 1
                print(f"Row {idx}: {exc}")

    print(f"Done. Created: {created}, Skipped: {skipped}, Errors: {errors}.")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
