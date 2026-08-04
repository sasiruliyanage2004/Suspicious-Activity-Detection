import sqlite3
import os

for db_name in ['sql_app.db', 'alerts.db']:
    if os.path.exists(db_name):
        try:
            conn = sqlite3.connect(db_name)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM alerts;")
            conn.commit()
            conn.close()
            print(f"Successfully purged all historical alerts from {db_name}")
        except Exception as e:
            print(f"Note on {db_name}: {e}")
