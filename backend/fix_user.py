import sqlite3
conn = sqlite3.connect('app.db')
cur = conn.cursor()
cur.execute("UPDATE users SET role='admin', is_active=1 WHERE email='gabriele.garimberti@gmail.com'")
conn.commit()
print('Righe modificate:', cur.rowcount)
conn.close()
