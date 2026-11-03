"""Run once: python init_db.py  (creates tables, starter content and the owner account)"""
try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError:
    pass
import db
db.init()
print('Database ready (%s).' % db.KIND)
