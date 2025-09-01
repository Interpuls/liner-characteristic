# app/scripts/drop_leftover_temp_tables.py
from sqlmodel import Session
from sqlalchemy import text
from app.db import engine

def main():
    with Session(engine) as s:
        s.exec(text("DROP TABLE IF EXISTS products_new"))
        s.exec(text("DROP TABLE IF EXISTS product_applications_new"))
        s.commit()
        print("Dropped leftover temp tables if any.")

if __name__ == "__main__":
    main()
