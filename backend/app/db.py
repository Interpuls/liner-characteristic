from sqlmodel import SQLModel, create_engine, Session
import os
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def init_db():
    #SQLModel.metadata.create_all(engine)
    pass

def get_session():
    with Session(engine) as session:
        yield session

# For SQLite foreign key enforcement
@event.listens_for(Engine, "connect")
def set_sqlite_fk_pragma(dbapi_connection, _):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()
