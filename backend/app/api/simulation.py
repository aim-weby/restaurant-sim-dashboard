from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.baseline_week import BaselineWeek
from app.models.baseline_daypart_data import BaselineDaypartData
from app.models.staffing_plan import StaffingPlan
from app.models.cost_settings import CostSettings
from app.schemas.simulation import SimulationRunRequest

from app.simulation.monte_carlo import (
    CellInput,
    StaffingInput,
    CostInputs,
    run_monte_carlo,
)

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.post("/run")
def run_simulation(req: SimulationRunRequest, db: Session = Depends(get_db)):
    # --------- Validate baseline week exists ---------
    week = db.query(BaselineWeek).filter(BaselineWeek.id == req.baseline_week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    # --------- Load baseline cells ---------
    cells_db = (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == req.baseline_week_id)
        .all()
    )
    if len(cells_db) == 0:
        raise HTTPException(status_code=400, detail="No baseline daypart data found for this week")

    # Apply demand/price multipliers (MVP: global multipliers)
    arrivals_multiplier = req.overrides.arrivals_multiplier
    spend_multiplier = req.overrides.spend_multiplier

    cells = [
        CellInput(
            weekday=c.weekday,
            daypart_id=c.daypart_id,
            arrivals_groups=int(round(c.arrivals_groups * arrivals_multiplier)),
            avg_spend_per_group=float(c.avg_spend_per_group) * spend_multiplier,
            avg_party_size=float(c.avg_party_size),
        )
        for c in cells_db
    ]

    # --------- Load staffing plan ---------
    staffing_db = db.query(StaffingPlan).all()
    if len(staffing_db) == 0:
        # Staffing is optional, but then capacity is infinite and labor cost is 0.
        staffing_db = []

    # Build delta map (weekday, daypart_id, role) -> delta staff_count
    delta_map = {}
    for d in req.overrides.staffing_delta:
        key = (d.weekday, d.daypart_id, d.role)
        delta_map[key] = delta_map.get(key, 0) + d.staff_count_delta

    staffing: list[StaffingInput] = []
    for s in staffing_db:
        delta = delta_map.get((s.weekday, s.daypart_id, s.role), 0)
        staffing.append(
            StaffingInput(
                weekday=s.weekday,
                daypart_id=s.daypart_id,
                role=s.role,
                staff_count=max(0, s.staff_count + delta),
                hourly_rate=float(s.hourly_rate),
                hours_in_daypart=float(s.hours_in_daypart),
            )
        )

    # If there are delta rows pointing to (weekday,daypart,role) that doesn't exist in DB,
    # we can treat them as "add new staffing row" with unknown hourly_rate/hours.
    # For MVP we will REJECT that to avoid silent wrong results.
    for d in req.overrides.staffing_delta:
        exists = any(
            (s.weekday == d.weekday and s.daypart_id == d.daypart_id and s.role == d.role)
            for s in staffing_db
        )
        if not exists:
            raise HTTPException(
                status_code=400,
                detail=f"staffing_delta references missing staffing row: weekday={d.weekday}, daypart_id={d.daypart_id}, role={d.role}",
            )

    # --------- Load cost settings (singleton) ---------
    costs_db = db.query(CostSettings).first()
    fixed_cost_week = float(costs_db.fixed_cost_week) if costs_db else 0.0
    food_cost_pct = float(costs_db.food_cost_pct) if costs_db else 0.30

    # Apply overrides for costs
    if req.overrides.fixed_cost_week_override is not None:
        fixed_cost_week = float(req.overrides.fixed_cost_week_override)
    if req.overrides.food_cost_pct_override is not None:
        food_cost_pct = float(req.overrides.food_cost_pct_override)

    costs = CostInputs(
        fixed_cost_week=fixed_cost_week,
        food_cost_pct=food_cost_pct,
    )

    # --------- Run Monte Carlo ---------
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
        "overrides": req.overrides.model_dump(),
        "result": result,
    }