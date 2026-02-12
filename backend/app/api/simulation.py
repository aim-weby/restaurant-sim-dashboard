from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.baseline_week import BaselineWeek
from app.models.baseline_daypart_data import BaselineDaypartData
from app.models.staffing_plan import StaffingPlan
from app.models.cost_settings import CostSettings
from app.models.simulation_params import SimulationParams
from app.models.daypart import Daypart
from app.models.venue import VenueSettings
from app.schemas.simulation import SimulationRunRequest

from app.simulation.des_engine import (
    DaypartSlot,
    SimParams,
    CostInputs,
    run_simulation,
)

router = APIRouter(prefix="/simulation", tags=["simulation"])


def _hhmm_to_minutes(t: str) -> float:
    """Convert 'HH:MM' to minutes since midnight."""
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _build_slots(
    cells_db,
    staffing_db,
    dayparts_map: dict,
    overrides,
) -> list[DaypartSlot]:
    """Build DaypartSlot list from DB data + scenario overrides."""

    arrivals_multiplier = overrides.arrivals_multiplier
    spend_multiplier = overrides.spend_multiplier

    # Build staffing delta map from spec-aligned staffing_changes
    delta_map: dict[tuple, int] = {}
    for sc in overrides.staffing_changes:
        key = (sc.weekday, sc.daypart_id, sc.role)
        delta_map[key] = delta_map.get(key, 0) + sc.delta_staff

    # Build staffing lookup: (weekday, daypart_id) -> {kitchen, service}
    staffing_map: dict[tuple, dict[str, int]] = {}
    for s in staffing_db:
        key = (s.weekday, s.daypart_id)
        if key not in staffing_map:
            staffing_map[key] = {"kitchen": 0, "service": 0}
        delta = delta_map.get((s.weekday, s.daypart_id, s.role), 0)
        count = max(0, s.staff_count + delta)
        if s.role in ("kitchen", "service"):
            staffing_map[key][s.role] = count

    slots = []
    for c in cells_db:
        dp = dayparts_map.get(c.daypart_id)
        if not dp:
            continue

        start_min = _hhmm_to_minutes(dp.start_time)
        end_min = _hhmm_to_minutes(dp.end_time)
        duration = end_min - start_min
        if duration <= 0:
            duration = (24 * 60 - start_min) + end_min

        weekday_offset = c.weekday * 24 * 60

        key = (c.weekday, c.daypart_id)
        staff = staffing_map.get(key, {"kitchen": 1, "service": 1})

        slots.append(DaypartSlot(
            weekday=c.weekday,
            daypart_id=c.daypart_id,
            start_minutes=weekday_offset + start_min,
            duration_minutes=duration,
            arrivals_groups=int(round(c.arrivals_groups * arrivals_multiplier)),
            avg_spend_per_group=float(c.avg_spend_per_group) * spend_multiplier,
            avg_party_size=float(c.avg_party_size),
            kitchen_staff=staff["kitchen"],
            service_staff=staff["service"],
        ))

    return slots


@router.post("/run")
def run_sim(req: SimulationRunRequest, db: Session = Depends(get_db)):
    # --------- Validate baseline week ---------
    week = db.query(BaselineWeek).filter(BaselineWeek.id == req.baseline_week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    # --------- Load dayparts ---------
    dayparts = db.query(Daypart).all()
    dayparts_map = {d.id: d for d in dayparts}

    # --------- Load baseline cells ---------
    cells_db = (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == req.baseline_week_id)
        .all()
    )
    if not cells_db:
        raise HTTPException(status_code=400, detail="No baseline daypart data for this week")

    # --------- Load staffing ---------
    staffing_db = db.query(StaffingPlan).all()

    # --------- Load venue (seats_total) ---------
    venue = db.query(VenueSettings).first()
    seats_total = venue.seats_total if venue else 40

    # Apply capacity_changes from overrides
    if req.overrides.capacity_changes:
        seats_total = max(1, seats_total + req.overrides.capacity_changes.seats_total)

    # --------- Load simulation params ---------
    sp = db.query(SimulationParams).filter(
        SimulationParams.baseline_week_id == req.baseline_week_id
    ).first()

    # Compute price_delta from price_change override
    price_delta = 0.0
    if req.overrides.price_change:
        if req.overrides.price_change.type == "percent":
            price_delta = req.overrides.price_change.value  # e.g. 0.08 = +8%
        elif req.overrides.price_change.type == "absolute":
            # Convert absolute to percent using avg spend
            avg_spend_values = [float(c.avg_spend_per_group) for c in cells_db if c.avg_spend_per_group > 0]
            avg_spend = sum(avg_spend_values) / len(avg_spend_values) if avg_spend_values else 1.0
            price_delta = req.overrides.price_change.value / avg_spend

    sim_params = SimParams(
        prep_time_min=sp.prep_time_min if sp else 5.0,
        prep_time_mode=sp.prep_time_mode if sp else 12.0,
        prep_time_max=sp.prep_time_max if sp else 25.0,
        seat_time_min=sp.seat_time_min if sp else 30.0,
        seat_time_mode=sp.seat_time_mode if sp else 45.0,
        seat_time_max=sp.seat_time_max if sp else 75.0,
        alpha_seat_wait=sp.alpha_seat_wait if sp else 0.0,
        balking_wait_table_limit=sp.balking_wait_table_limit if sp else 0.0,
        balking_wait_food_limit=sp.balking_wait_food_limit if sp else 0.0,
        price_elasticity=sp.price_elasticity if sp else -1.2,
        demand_noise_pct=sp.demand_noise_pct if sp else 0.2,
        price_delta=price_delta,
    )

    # --------- Build daypart slots ---------
    slots = _build_slots(cells_db, staffing_db, dayparts_map, req.overrides)

    # --------- Compute labor cost ---------
    labor_cost = sum(
        float(s.staff_count) * float(s.hourly_rate) * float(s.hours_in_daypart)
        for s in staffing_db
    )

    # --------- Load costs ---------
    costs_db = db.query(CostSettings).first()
    fixed_cost_week = float(costs_db.fixed_cost_week) if costs_db else 0.0
    food_cost_pct = float(costs_db.food_cost_pct) if costs_db else 0.30

    if req.overrides.fixed_cost_week_override is not None:
        fixed_cost_week = float(req.overrides.fixed_cost_week_override)
    if req.overrides.food_cost_pct_override is not None:
        food_cost_pct = float(req.overrides.food_cost_pct_override)

    costs = CostInputs(
        fixed_cost_week=fixed_cost_week,
        food_cost_pct=food_cost_pct,
        labor_cost=labor_cost,
    )

    # --------- Run DES ---------
    result = run_simulation(
        slots=slots,
        sim_params=sim_params,
        costs=costs,
        seats_total=seats_total,
        runs=req.runs,
        base_seed=req.seed if req.seed is not None else 42,
    )

    return {
        "baseline_week_id": req.baseline_week_id,
        "week_start": week.week_start,
        "overrides": req.overrides.model_dump(),
        "result": result,
    }