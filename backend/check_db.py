import os
import sqlite3

url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
db = url.replace("sqlite:///", "")
print("DB path:", db)

con = sqlite3.connect(db)

# Tutte le tabelle
tables = con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tabelle trovate:", tables)

# Controllo specifico kpi_def
rows = con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='kpi_def'").fetchall()
print("kpi_def:", rows)

con.close()
