from sqlalchemy import text
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.cost_settings import CostSettings
from app.schemas.costs import CostSettingsOut, CostSettingsUpdate

router = APIRouter(prefix="/settings/costs", tags=["settings"])

def get_or_create(db: Session) -> CostSettings:
    row = db.query(CostSettings).first()
    if row is None:
        row = CostSettings()
        db.add(row)
        db.execute(text("UPDATE baseline_weeks SET kpis_cache_json = NULL")); db.commit()
        db.refresh(row)
    return row

@router.get("", response_model=CostSettingsOut)
def get_costs(db: Session = Depends(get_db)):
    return get_or_create(db)

@router.put("", response_model=CostSettingsOut)
def update_costs(payload: CostSettingsUpdate, db: Session = Depends(get_db)):
    row = get_or_create(db)
    row.fixed_cost_week = payload.fixed_cost_week
    row.food_cost_pct = payload.food_cost_pct
    db.add(row)
    db.execute(text("UPDATE baseline_weeks SET kpis_cache_json = NULL")); db.commit()
    db.refresh(row)
    return row