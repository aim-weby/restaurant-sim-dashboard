from sqlalchemy import text
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.simulation_params import SimulationParams
from app.schemas.simulation_params import SimulationParamsIn, SimulationParamsOut

router = APIRouter()


@router.get("/baseline-weeks/{week_id}/sim-params", response_model=SimulationParamsOut)
def get_sim_params(week_id: int, db: Session = Depends(get_db)):
    row = db.query(SimulationParams).filter(SimulationParams.baseline_week_id == week_id).first()
    if not row:
        # Return defaults tied to this week (not yet persisted)
        row = SimulationParams(baseline_week_id=week_id)
        db.add(row)
        db.execute(text("UPDATE baseline_weeks SET kpis_cache_json = NULL")); db.commit()
        db.refresh(row)
    return row


@router.put("/baseline-weeks/{week_id}/sim-params", response_model=SimulationParamsOut)
def put_sim_params(week_id: int, payload: SimulationParamsIn, db: Session = Depends(get_db)):
    row = db.query(SimulationParams).filter(SimulationParams.baseline_week_id == week_id).first()
    if not row:
        row = SimulationParams(baseline_week_id=week_id)
        db.add(row)

    for field, value in payload.model_dump().items():
        setattr(row, field, value)

    db.execute(text("UPDATE baseline_weeks SET kpis_cache_json = NULL")); db.commit()
    db.refresh(row)
    return row
