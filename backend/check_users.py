import sqlite3
conn = sqlite3.connect('app.db')
cur = conn.cursor()
cur.execute("SELECT id, email, role, is_active FROM users")
for row in cur.fetchall():
    print(row)
conn.close()
