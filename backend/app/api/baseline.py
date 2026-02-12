from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.baseline_week import BaselineWeek
from app.models.baseline_daypart_data import BaselineDaypartData
from app.models.daypart import Daypart
from app.schemas.baseline import (
    BaselineWeekOut, BaselineWeekCreate, BaselineWeekUpdate,
    BaselineCellOut, BaselineCellUpsert
)
from app.models.cost_settings import CostSettings
from app.models.staffing_plan import StaffingPlan
from app.models.simulation_params import SimulationParams
from app.models.venue import VenueSettings

router = APIRouter(prefix="/baseline-weeks", tags=["baseline"])

# ---- Weeks ----
@router.get("", response_model=list[BaselineWeekOut])
def list_weeks(db: Session = Depends(get_db)):
    return db.query(BaselineWeek).order_by(BaselineWeek.id.desc()).all()

@router.post("", response_model=BaselineWeekOut, status_code=201)
def create_week(payload: BaselineWeekCreate, db: Session = Depends(get_db)):
    week = BaselineWeek(week_start=payload.week_start, label=payload.label)
    db.add(week)
    db.commit()
    db.refresh(week)
    return week

@router.put("/{week_id}", response_model=BaselineWeekOut)
def update_week(week_id: int, payload: BaselineWeekUpdate, db: Session = Depends(get_db)):
    week = db.query(BaselineWeek).filter(BaselineWeek.id == week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")
    if payload.label is not None:
        week.label = payload.label
    db.add(week)
    db.commit()
    db.refresh(week)
    return week

# ---- Grid cells ----
@router.get("/{week_id}/data", response_model=list[BaselineCellOut])
def get_week_data(week_id: int, db: Session = Depends(get_db)):
    # return all stored cells (not auto-filled)
    return (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == week_id)
        .all()
    )

@router.put("/{week_id}/data", response_model=list[BaselineCellOut])
def upsert_week_data(week_id: int, payload: list[BaselineCellUpsert], db: Session = Depends(get_db)):
    # ensure week exists
    week = db.query(BaselineWeek).filter(BaselineWeek.id == week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    # ensure dayparts exist (basic check)
    daypart_ids = {d.id for d in db.query(Daypart).all()}
    for item in payload:
        if item.daypart_id not in daypart_ids:
            raise HTTPException(status_code=400, detail=f"Invalid daypart_id {item.daypart_id}")

    updated_rows: list[BaselineDaypartData] = []

    for item in payload:
        row = (
            db.query(BaselineDaypartData)
            .filter(
                BaselineDaypartData.baseline_week_id == week_id,
                BaselineDaypartData.weekday == item.weekday,
                BaselineDaypartData.daypart_id == item.daypart_id,
            )
            .first()
        )
        if row is None:
            row = BaselineDaypartData(
                baseline_week_id=week_id,
                weekday=item.weekday,
                daypart_id=item.daypart_id,
                arrivals_groups=item.arrivals_groups,
                avg_spend_per_group=item.avg_spend_per_group,
                avg_party_size=item.avg_party_size,
            )
            db.add(row)
        else:
            row.arrivals_groups = item.arrivals_groups
            row.avg_spend_per_group = item.avg_spend_per_group
            row.avg_party_size = item.avg_party_size
            db.add(row)

        updated_rows.append(row)

    db.commit()

    # refresh rows
    for r in updated_rows:
        db.refresh(r)

    return updated_rows

@router.get("/{week_id}/kpis")
def get_week_kpis(week_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == week_id)
        .all()
    )

    revenue = 0.0
    arrivals_total = 0

    for r in rows:
        arrivals_total += r.arrivals_groups
        revenue += r.arrivals_groups * r.avg_spend_per_group

    # costs settings (singleton)
    costs = db.query(CostSettings).first()
    fixed_cost_week = costs.fixed_cost_week if costs else 0.0
    food_cost_pct = costs.food_cost_pct if costs else 0.30

    cogs = revenue * food_cost_pct

    # labor (sum staffing_plan)
    labor_cost = 0.0
    staffing_rows = db.query(StaffingPlan).all()
    for s in staffing_rows:
        labor_cost += s.staff_count * s.hourly_rate * s.hours_in_daypart

    profit = revenue - cogs - labor_cost - fixed_cost_week
    profit_margin = (profit / revenue) if revenue > 0 else 0.0
    labor_ratio = (labor_cost / revenue) if revenue > 0 else 0.0
    prime_cost_ratio = ((cogs + labor_cost) / revenue) if revenue > 0 else 0.0

    # --- timeseries aggregations ---
    daypart_list = db.query(Daypart).all()
    dp_label_map = {dp.id: dp.label for dp in daypart_list}

    # by_weekday
    by_weekday: dict[int, dict] = {}
    for r in rows:
        wd = r.weekday
        if wd not in by_weekday:
            by_weekday[wd] = {"weekday": wd, "finance.revenue": 0.0, "demand.arrivals_groups": 0}
        rev = r.arrivals_groups * r.avg_spend_per_group
        by_weekday[wd]["finance.revenue"] += rev
        by_weekday[wd]["demand.arrivals_groups"] += r.arrivals_groups

    # by_daypart
    by_daypart: dict[int, dict] = {}
    for r in rows:
        dp = r.daypart_id
        if dp not in by_daypart:
            by_daypart[dp] = {"daypart_id": dp, "label": dp_label_map.get(dp, f"Daypart {dp}"), "finance.revenue": 0.0, "demand.arrivals_groups": 0}
        rev = r.arrivals_groups * r.avg_spend_per_group
        by_daypart[dp]["finance.revenue"] += rev
        by_daypart[dp]["demand.arrivals_groups"] += r.arrivals_groups

    # heatmap (weekday × daypart)
    heatmap = []
    for r in rows:
        rev = r.arrivals_groups * r.avg_spend_per_group
        heatmap.append({
            "weekday": r.weekday,
            "daypart_id": r.daypart_id,
            "demand.arrivals_groups": r.arrivals_groups,
            "finance.revenue": rev,
        })

    # currency from venue
    venue = db.query(VenueSettings).first()
    currency = venue.currency if venue else "CZK"

    # labor by daypart
    by_daypart_labor: dict[int, float] = {}
    for s in staffing_rows:
        dp_id = s.daypart_id
        by_daypart_labor[dp_id] = by_daypart_labor.get(dp_id, 0) + s.staff_count * s.hourly_rate * s.hours_in_daypart
    for dp_id, cost in by_daypart_labor.items():
        if dp_id in by_daypart:
            by_daypart[dp_id]["finance.labor_cost"] = cost

    return {
        "baseline_week_id": week_id,
        "currency": currency,
        "kpis": {
            "finance.revenue": revenue,
            "finance.cogs": cogs,
            "finance.labor_cost": labor_cost,
            "finance.fixed_cost": fixed_cost_week,
            "finance.profit": profit,
            "finance.profit_margin": profit_margin,
            "finance.labor_cost_ratio": labor_ratio,
            "finance.prime_cost_ratio": prime_cost_ratio,
            "demand.arrivals_groups": arrivals_total,
        },
        "timeseries": {
            "by_weekday": sorted(by_weekday.values(), key=lambda x: x["weekday"]),
            "by_daypart": sorted(by_daypart.values(), key=lambda x: x["daypart_id"]),
            "heatmap": heatmap,
        },
        "inputs_used": {
            "food_cost_pct": food_cost_pct,
            "fixed_cost_week": fixed_cost_week
        }
    }


# ---------- Data Health ----------
@router.get("/{week_id}/health")
def get_week_health(week_id: int, db: Session = Depends(get_db)):
    """Coverage checks + actionability score for a baseline week."""

    dayparts = db.query(Daypart).all()
    n_dayparts = len(dayparts)

    checks: list[dict] = []
    recommendations: list[str] = []

    # 1. Dayparts exist
    ok = n_dayparts > 0
    checks.append({"key": "dayparts_exist", "label": "Dayparts defined", "status": "ok" if ok else "missing"})
    if not ok:
        recommendations.append("Create at least one daypart (e.g. Lunch, Dinner).")

    # 2. Baseline data complete (7 days × N dayparts)
    expected_cells = 7 * n_dayparts if n_dayparts > 0 else 0
    actual_cells = (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == week_id)
        .count()
    )
    ok = expected_cells > 0 and actual_cells >= expected_cells
    detail = f"{actual_cells}/{expected_cells} cells filled" if expected_cells > 0 else "no dayparts"
    checks.append({"key": "baseline_data_complete", "label": "Baseline grid complete (7×N)", "status": "ok" if ok else "missing", "detail": detail})
    if not ok:
        recommendations.append(f"Fill missing baseline cells ({detail}).")

    # 3. Staffing – kitchen exists
    kitchen_count = db.query(StaffingPlan).filter(StaffingPlan.role == "kitchen").count()
    ok = kitchen_count > 0
    checks.append({"key": "staffing_kitchen", "label": "Kitchen staffing plan", "status": "ok" if ok else "missing"})
    if not ok:
        recommendations.append("Add kitchen staffing rows in the Staffing page.")

    # 4. Staffing – service exists
    service_count = db.query(StaffingPlan).filter(StaffingPlan.role == "service").count()
    ok = service_count > 0
    checks.append({"key": "staffing_service", "label": "Service staffing plan", "status": "ok" if ok else "missing"})
    if not ok:
        recommendations.append("Add service staffing rows in the Staffing page.")

    # 5. Sim params exist for this week
    sim_params = db.query(SimulationParams).filter(SimulationParams.baseline_week_id == week_id).first()
    ok = sim_params is not None
    checks.append({"key": "sim_params_exist", "label": "Simulation parameters set", "status": "ok" if ok else "missing"})
    if not ok:
        recommendations.append("Configure simulation parameters (prep time, seat time, balking limits).")

    # 6. Cost settings exist
    costs = db.query(CostSettings).first()
    ok = costs is not None
    checks.append({"key": "costs_exist", "label": "Cost settings defined", "status": "ok" if ok else "missing"})
    if not ok:
        recommendations.append("Set fixed weekly costs and food cost percentage.")

    # 7. Venue settings exist (seats > 0)
    venue = db.query(VenueSettings).first()
    ok = venue is not None and venue.seats_total > 0
    checks.append({"key": "venue_configured", "label": "Venue configured (seats > 0)", "status": "ok" if ok else "missing"})
    if not ok:
        recommendations.append("Configure venue with table/seat counts.")

    # Coverage score
    ok_count = sum(1 for c in checks if c["status"] == "ok")
    total = len(checks)
    coverage_score = round((ok_count / total) * 100) if total > 0 else 0

    # Actionability score
    week_count = db.query(BaselineWeek).count()
    if week_count >= 4:
        action_base = 75
    elif week_count >= 2:
        action_base = 50
    else:
        action_base = 25

    # +10 if sim params have non-default balking/triangular
    if sim_params is not None:
        action_base += 10

    # -10 per critical missing area
    if kitchen_count == 0:
        action_base -= 10
    if costs is None:
        action_base -= 10
    if venue is None or venue.seats_total == 0:
        action_base -= 10

    actionability_score = max(0, min(100, action_base))

    if week_count < 3:
        recommendations.append(f"Currently {week_count} week(s) of data — collect 3+ weeks for more reliable conclusions.")

    return {
        "baseline_week_id": week_id,
        "coverage_score": coverage_score,
        "actionability_score": actionability_score,
        "checks": checks,
        "recommendations": recommendations,
    }