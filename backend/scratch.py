from app.db.session import SessionLocal
from app.models.baseline_week import BaselineWeek

db = SessionLocal()
weeks = db.query(BaselineWeek).all()
for w in weeks:
    w.kpis_cache_json = None
db.commit()
print("Cleared cache.")
