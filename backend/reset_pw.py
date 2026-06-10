import sqlite3
import sys
sys.path.insert(0, '.')
from app.auth import hash_password
conn = sqlite3.connect('app.db')
cur = conn.cursor()
cur.execute("UPDATE users SET hashed_password=? WHERE email='user@milkrite-interpuls.com'", (hash_password('Admin1234'),))
conn.commit()
print('Righe modificate:', cur.rowcount)
conn.close()
