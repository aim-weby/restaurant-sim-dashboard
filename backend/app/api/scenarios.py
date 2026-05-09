from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.baseline_week import BaselineWeek
from app.models.baseline_daypart_data import BaselineDaypartData
from app.models.cost_settings import CostSettings
from app.models.staffing_plan import StaffingPlan
from app.models.simulation_scenario import SimulationScenario
from app.schemas.scenarios import ScenarioCreate, ScenarioOut, ScenarioRunRequest

from app.schemas.simulation import SimulationRunRequest as SimRunReq, SimulationOverrides
from app.api.simulation import run_sim

router = APIRouter(tags=["scenarios"])


@router.get("/baseline-weeks/{week_id}/scenarios", response_model=list[ScenarioOut])
def list_scenarios(week_id: int, db: Session = Depends(get_db)):
    week = db.query(BaselineWeek).filter(BaselineWeek.id == week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    items = (
        db.query(SimulationScenario)
        .filter(SimulationScenario.baseline_week_id == week_id)
        .order_by(SimulationScenario.id.asc())
        .all()
    )

    out: list[ScenarioOut] = []
    for s in items:
        out.append(
            ScenarioOut(
                id=s.id,
                baseline_week_id=s.baseline_week_id,
                name=s.name,
                created_at=s.created_at,
                params=s.get_params(),
            )
        )
    return out


@router.post("/baseline-weeks/{week_id}/scenarios", response_model=ScenarioOut)
def create_scenario(week_id: int, payload: ScenarioCreate, db: Session = Depends(get_db)):
    week = db.query(BaselineWeek).filter(BaselineWeek.id == week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    s = SimulationScenario(baseline_week_id=week_id, name=payload.name)
    s.set_params(payload.params)
    db.add(s)
    db.commit()
    db.refresh(s)

    return ScenarioOut(
        id=s.id,
        baseline_week_id=s.baseline_week_id,
        name=s.name,
        created_at=s.created_at,
        params=s.get_params(),
    )


@router.delete("/scenarios/{scenario_id}", status_code=204)
def delete_scenario(scenario_id: int, db: Session = Depends(get_db)):
    s = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if s is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    db.delete(s)
    db.commit()

@router.post("/scenarios/{scenario_id}/run")
def run_saved_scenario(scenario_id: int, req: ScenarioRunRequest, db: Session = Depends(get_db)):
    s = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if s is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Build SimulationOverrides from saved params JSON
    params = s.get_params()
    overrides = SimulationOverrides(**params)

    sim_req = SimRunReq(
        baseline_week_id=s.baseline_week_id,
        runs=req.runs,
        seed=req.seed,
        overrides=overrides,
    )

    return run_sim(sim_req, db)


# ---------- Deterministic Scenario KPI ----------
@router.get("/scenarios/{scenario_id}/kpis")
def scenario_kpis(scenario_id: int, db: Session = Depends(get_db)):
    """Compute deterministic KPI deltas for a scenario vs its baseline, without simulation."""

    s = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if s is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    week_id = s.baseline_week_id
    params = s.get_params()
    ov = SimulationOverrides(**params)

    # ---- Baseline KPIs (deterministic) ----
    rows = (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == week_id)
        .all()
    )

    base_revenue = 0.0
    base_arrivals = 0
    for r in rows:
        base_revenue += r.arrivals_groups * r.avg_spend_per_group
        base_arrivals += r.arrivals_groups

    costs = db.query(CostSettings).first()
    base_food_cost_pct = costs.food_cost_pct if costs else 0.30
    base_fixed = costs.fixed_cost_week if costs else 0.0

    base_cogs = base_revenue * base_food_cost_pct

    base_labor = 0.0
    staffing_rows = db.query(StaffingPlan).all()
    for st in staffing_rows:
        base_labor += st.staff_count * st.hourly_rate * st.hours_in_daypart

    base_profit = base_revenue - base_cogs - base_labor - base_fixed

    # ---- Scenario KPIs (apply overrides deterministically) ----

    # 1) Revenue: price_change affects spend_multiplier via elasticity
    #    spend_multiplier and arrivals_multiplier are direct multipliers
    spend_mult = ov.spend_multiplier
    arr_mult = ov.arrivals_multiplier

    # price_change → affects spend (percent type adjusts spend_multiplier)
    if ov.price_change and ov.price_change.type == "percent":
        spend_mult *= (1.0 + ov.price_change.value)
    elif ov.price_change and ov.price_change.type == "absolute" and base_revenue > 0:
        # absolute price change per group
        avg_spend = base_revenue / base_arrivals if base_arrivals > 0 else 0
        if avg_spend > 0:
            spend_mult *= (avg_spend + ov.price_change.value) / avg_spend

    sc_revenue = base_revenue * arr_mult * spend_mult
    sc_arrivals = base_arrivals * arr_mult
    sc_labor = base_labor
    
    # Apply synthetic newly opened days
    if ov.opening_hours_changes:
        open_days_count = len(set(r.weekday for r in rows if r.arrivals_groups > 0))
        if open_days_count > 0:
            avg_rev_per_day = base_revenue / open_days_count
            avg_arr_per_day = base_arrivals / open_days_count
            avg_lab_per_day = base_labor / open_days_count
            for oh in ov.opening_hours_changes:
                # Check if currently closed
                if sum(r.arrivals_groups for r in rows if r.weekday == oh.weekday) == 0:
                    sc_revenue += avg_rev_per_day * arr_mult * spend_mult
                    sc_arrivals += avg_arr_per_day * arr_mult
                    sc_labor += avg_lab_per_day

    # 2) COGS: use overridden food_cost_pct if provided
    sc_food_cost_pct = ov.food_cost_pct_override if ov.food_cost_pct_override is not None else base_food_cost_pct
    sc_cogs = sc_revenue * sc_food_cost_pct

    # 3) Labor: apply staffing_changes
    #    Build a map of (weekday, daypart_id, role) → delta_staff
    #    For deterministic calc, we approximate: each delta_staff changes labor by
    #    delta_staff * avg_hourly_rate * avg_hours for that role
    if ov.staffing_changes:
        # Build rate lookup from existing staffing
        role_rates: dict[str, list[tuple[float, float]]] = {}
        for st in staffing_rows:
            role_rates.setdefault(st.role, []).append((st.hourly_rate, st.hours_in_daypart))

        for sc in ov.staffing_changes:
            # Try to find matching existing rate, fallback to role average
            matched = [(st.hourly_rate, st.hours_in_daypart) for st in staffing_rows
                       if st.weekday == sc.weekday and st.daypart_id == sc.daypart_id and st.role == sc.role]
            if matched:
                rate, hours = matched[0]
            elif role_rates.get(sc.role):
                rates_list = role_rates[sc.role]
                rate = sum(r for r, _ in rates_list) / len(rates_list)
                hours = sum(h for _, h in rates_list) / len(rates_list)
            else:
                rate = 200.0  # fallback hourly rate
                hours = 4.0   # fallback hours
            sc_labor += sc.delta_staff * rate * hours

    # 4) Fixed costs: override if provided
    sc_fixed = ov.fixed_cost_week_override if ov.fixed_cost_week_override is not None else base_fixed

    # 5) Profit
    sc_profit = sc_revenue - sc_cogs - sc_labor - sc_fixed

    def margin(profit: float, revenue: float) -> float:
        return (profit / revenue) if revenue > 0 else 0.0

    def ratio(cost: float, revenue: float) -> float:
        return (cost / revenue) if revenue > 0 else 0.0

    baseline_kpis = {
        "finance.revenue": base_revenue,
        "finance.cogs": base_cogs,
        "finance.labor_cost": base_labor,
        "finance.fixed_cost": base_fixed,
        "finance.profit": base_profit,
        "finance.profit_margin": margin(base_profit, base_revenue),
        "finance.labor_cost_ratio": ratio(base_labor, base_revenue),
        "finance.prime_cost_ratio": ratio(base_cogs + base_labor, base_revenue),
        "demand.arrivals_groups": base_arrivals,
    }

    scenario_kpis = {
        "finance.revenue": sc_revenue,
        "finance.cogs": sc_cogs,
        "finance.labor_cost": sc_labor,
        "finance.fixed_cost": sc_fixed,
        "finance.profit": sc_profit,
        "finance.profit_margin": margin(sc_profit, sc_revenue),
        "finance.labor_cost_ratio": ratio(sc_labor, sc_revenue),
        "finance.prime_cost_ratio": ratio(sc_cogs + sc_labor, sc_revenue),
        "demand.arrivals_groups": round(sc_arrivals),
    }

    deltas = {k: scenario_kpis[k] - baseline_kpis[k] for k in baseline_kpis}

    return {
        "scenario_id": scenario_id,
        "scenario_name": s.name,
        "baseline_week_id": week_id,
        "baseline_kpis": baseline_kpis,
        "scenario_kpis": scenario_kpis,
        "deltas": deltas,
    }