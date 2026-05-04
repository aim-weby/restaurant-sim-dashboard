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
    price_spend_mult: float = 1.0,
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

    opening_weekdays = {oh.weekday: (_hhmm_to_minutes(oh.open_time), _hhmm_to_minutes(oh.close_time)) for oh in overrides.opening_hours_changes}

    # Pre-calculate averages for each daypart_id
    daypart_averages = {}
    for c in cells_db:
        if c.arrivals_groups > 0:
            if c.daypart_id not in daypart_averages:
                daypart_averages[c.daypart_id] = {
                    "arrivals": [], "spend": [], "party": [], "kitchen": [], "service": []
                }
            daypart_averages[c.daypart_id]["arrivals"].append(c.arrivals_groups)
            daypart_averages[c.daypart_id]["spend"].append(float(c.avg_spend_per_group))
            daypart_averages[c.daypart_id]["party"].append(float(c.avg_party_size))
            staff = staffing_map.get((c.weekday, c.daypart_id), {"kitchen": 1, "service": 1})
            daypart_averages[c.daypart_id]["kitchen"].append(staff["kitchen"])
            daypart_averages[c.daypart_id]["service"].append(staff["service"])

    for dp_id, vals in daypart_averages.items():
        if vals["arrivals"]:
            daypart_averages[dp_id] = {
                "arrivals": sum(vals["arrivals"]) / len(vals["arrivals"]),
                "spend": sum(vals["spend"]) / len(vals["spend"]),
                "party": sum(vals["party"]) / len(vals["party"]),
                "kitchen": max(1, round(sum(vals["kitchen"]) / len(vals["kitchen"]))),
                "service": max(1, round(sum(vals["service"]) / len(vals["service"]))),
            }

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

        is_newly_opened = False
        if c.weekday in opening_weekdays and c.arrivals_groups == 0:
            open_min, close_min = opening_weekdays[c.weekday]
            if start_min < close_min and end_min > open_min:
                is_newly_opened = True

        key = (c.weekday, c.daypart_id)
        if is_newly_opened and c.daypart_id in daypart_averages:
            avg = daypart_averages[c.daypart_id]
            arrivals = avg["arrivals"]
            spend = avg["spend"]
            party = avg["party"]
            k_staff = avg["kitchen"]
            s_staff = avg["service"]
            
            # Since the day is artificially opened, we need to add labor costs for it
            # We'll update staffing_map so labor cost computation later can pick it up
            # wait, labor cost computation loops over staffing_db, which doesn't have these!
            # It's better to add the staff back to the delta_map or staffing_map so later labor cost can be corrected.
            # But labor cost uses staffing_db directly. We will handle labor cost issue separately or accept it for now.
        else:
            arrivals = c.arrivals_groups
            spend = float(c.avg_spend_per_group)
            party = float(c.avg_party_size)
            staff = staffing_map.get(key, {"kitchen": 0, "service": 0})
            k_staff = staff["kitchen"]
            s_staff = staff["service"]

        slots.append(DaypartSlot(
            weekday=c.weekday,
            daypart_id=c.daypart_id,
            start_minutes=weekday_offset + start_min,
            duration_minutes=duration,
            arrivals_groups=int(round(arrivals * arrivals_multiplier)),
            avg_spend_per_group=spend * spend_multiplier * price_spend_mult,
            avg_party_size=party,
            kitchen_staff=k_staff,
            service_staff=s_staff,
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

    # Compute price_delta (elasticity) and price_spend_mult (revenue) from price_change
    price_delta = 0.0
    price_spend_mult = 1.0
    if req.overrides.price_change:
        if req.overrides.price_change.type == "percent":
            price_delta = req.overrides.price_change.value  # e.g. 0.08 = +8%
            price_spend_mult = 1.0 + req.overrides.price_change.value
        elif req.overrides.price_change.type == "absolute":
            # Convert absolute to percent using avg spend
            avg_spend_values = [float(c.avg_spend_per_group) for c in cells_db if c.avg_spend_per_group > 0]
            avg_spend = sum(avg_spend_values) / len(avg_spend_values) if avg_spend_values else 1.0
            price_delta = req.overrides.price_change.value / avg_spend
            price_spend_mult = (avg_spend + req.overrides.price_change.value) / avg_spend if avg_spend > 0 else 1.0

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
    slots = _build_slots(cells_db, staffing_db, dayparts_map, req.overrides, price_spend_mult)

    # --------- Compute labor cost (with staffing overrides) ---------
    _delta_map: dict[tuple, int] = {}
    for sc in req.overrides.staffing_changes:
        _key = (sc.weekday, sc.daypart_id, sc.role)
        _delta_map[_key] = _delta_map.get(_key, 0) + sc.delta_staff

    labor_cost = sum(
        float(max(0, s.staff_count + _delta_map.get((s.weekday, s.daypart_id, s.role), 0)))
        * float(s.hourly_rate)
        * float(s.hours_in_daypart)
        for s in staffing_db
    )

    # Add labor cost for newly opened days (synthetic slots)
    opening_weekdays = {oh.weekday for oh in req.overrides.opening_hours_changes}
    avg_hourly_rate_k = sum(float(s.hourly_rate) for s in staffing_db if s.role == "kitchen") / max(1, sum(1 for s in staffing_db if s.role == "kitchen"))
    avg_hourly_rate_s = sum(float(s.hourly_rate) for s in staffing_db if s.role == "service") / max(1, sum(1 for s in staffing_db if s.role == "service"))
    
    for slot in slots:
        # If this slot belongs to a newly opened weekday AND has no staffing_db entry
        has_staffing_entry = any(s.weekday == slot.weekday and s.daypart_id == slot.daypart_id for s in staffing_db)
        if slot.weekday in opening_weekdays and not has_staffing_entry:
            hours = slot.duration_minutes / 60.0
            labor_cost += (slot.kitchen_staff * avg_hourly_rate_k * hours)
            labor_cost += (slot.service_staff * avg_hourly_rate_s * hours)

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