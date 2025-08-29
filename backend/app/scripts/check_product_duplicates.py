# scripts/check_product_duplicates.py
from sqlalchemy import func
from sqlmodel import select

#importiamo il modello Product e la session dal progettto
from app.models import Product
from app.db import get_session


def main():
    # usa lo stesso Session del progetto
    gen = get_session()
    session = next(gen)
    try:
        rows = session.exec(
            select(
                Product.brand,
                Product.model,
                func.count(Product.id)
            )
            .where(Product.brand.isnot(None), Product.model.isnot(None))
            .group_by(Product.brand, Product.model)
            .having(func.count(Product.id) > 1)
        ).all()

        if not rows:
            print("OK: no duplicates (brand, model).")
            return

        print("Duplicates found (brand | model | count):")
        for brand, model, cnt in rows:
            print(f"- {brand} | {model} | {cnt}")

            # opzionale: stampa gli ID dei record duplicati
            dup = session.exec(
                select(Product.id, Product.code, Product.name)
                .where(Product.brand == brand, Product.model == model)
                .order_by(Product.created_at.asc())
            ).all()
            for r in dup:
                print(f"    id={r.id} code={r.code} name={r.name}")
    finally:
        # chiude correttamente il generator della dependency (rilascia la session)
        try:
            next(gen)
        except StopIteration:
            pass

if __name__ == "__main__":
    main()
