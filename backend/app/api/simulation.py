from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.baseline_week import BaselineWeek
from app.models.baseline_daypart_data import BaselineDaypartData
from app.models.staffing_plan import StaffingPlan
from app.models.cost_settings import CostSettings
from app.schemas.simulation import SimulationRunRequest
from app.simulation.monte_carlo import CellInput, StaffingInput, CostInputs, run_monte_carlo

router = APIRouter(prefix="/simulation", tags=["simulation"])

@router.post("/run")
def run_simulation(req: SimulationRunRequest, db: Session = Depends(get_db)):
    week = db.query(BaselineWeek).filter(BaselineWeek.id == req.baseline_week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    cells_db = (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == req.baseline_week_id)
        .all()
    )
    cells = [
        CellInput(
            weekday=c.weekday,
            daypart_id=c.daypart_id,
            arrivals_groups=c.arrivals_groups,
            avg_spend_per_group=c.avg_spend_per_group,
            avg_party_size=c.avg_party_size,
        )
        for c in cells_db
    ]

    staffing_db = db.query(StaffingPlan).all()
    staffing = [
        StaffingInput(
            weekday=s.weekday,
            daypart_id=s.daypart_id,
            role=s.role,
            staff_count=s.staff_count,
            hourly_rate=s.hourly_rate,
            hours_in_daypart=s.hours_in_daypart,
        )
        for s in staffing_db
    ]

    costs_db = db.query(CostSettings).first()
    costs = CostInputs(
        fixed_cost_week=(costs_db.fixed_cost_week if costs_db else 0.0),
        food_cost_pct=(costs_db.food_cost_pct if costs_db else 0.30),
    )

    result = run_monte_carlo(
        cells=cells,
        staffing=staffing,
        costs=costs,
        runs=req.runs,
        seed=req.seed,
        arrivals_sigma=req.arrivals_sigma,
        spend_sigma=req.spend_sigma,
    )

    return {
        "baseline_week_id": req.baseline_week_id,
        "week_start": week.week_start,
        "result": result,
    }