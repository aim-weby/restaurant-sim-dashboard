"""
Reproducible experiment runner for BP thesis.

Runs predefined what-if scenarios against the current baseline week
and returns a structured comparison table — ready for thesis export.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.baseline_week import BaselineWeek
from app.models.baseline_daypart_data import BaselineDaypartData
from app.models.daypart import Daypart
from app.models.staffing_plan import StaffingPlan
from app.schemas.simulation import (
    SimulationRunRequest,
    SimulationOverrides,
    StaffingChange,
    PriceChange,
    CapacityChanges,
)
from app.api.simulation import run_sim

router = APIRouter(prefix="/experiments", tags=["experiments"])


def _find_peak_slot(
    cells_db, staffing_db
) -> dict:
    """Find the daypart+weekday with highest arrivals (= peak)."""
    best = None
    for c in cells_db:
        if best is None or c.arrivals_groups > best.arrivals_groups:
            best = c
    if best is None:
        return {"weekday": 5, "daypart_id": 1}  # fallback Saturday, daypart 1
    return {"weekday": best.weekday, "daypart_id": best.daypart_id}


def _find_weakest_slot(cells_db) -> dict:
    """Find the daypart+weekday with lowest (non-zero) arrivals."""
    best = None
    for c in cells_db:
        if c.arrivals_groups <= 0:
            continue
        if best is None or c.arrivals_groups < best.arrivals_groups:
            best = c
    if best is None:
        return {"weekday": 0, "daypart_id": 1}  # fallback Monday
    return {"weekday": best.weekday, "daypart_id": best.daypart_id}


def _build_experiments(cells_db, staffing_db, dayparts_db) -> list[dict]:
    """
    Build the 6 experiments from BP spec Section 13:
      1. Baseline (no changes)
      2. +1 kitchen (peak daypart)
      3. +1 service (peak daypart)
      4. +8% price increase (with elasticity)
      5. Remove weakest daypart staffing (simulate shorter hours)
      6. Combined: +1 kitchen at peak + small price increase (+5%)

    Experiments auto-detect peak/weak slots from the real data.
    """
    peak = _find_peak_slot(cells_db, staffing_db)
    weak = _find_weakest_slot(cells_db)

    daypart_labels = {d.id: d.label for d in dayparts_db}
    WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    peak_label = (
        f"{WEEKDAY_NAMES[peak['weekday']]} "
        f"{daypart_labels.get(peak['daypart_id'], f'DP{peak['daypart_id']}')}"
    )
    weak_label = (
        f"{WEEKDAY_NAMES[weak['weekday']]} "
        f"{daypart_labels.get(weak['daypart_id'], f'DP{weak['daypart_id']}')}"
    )

    return [
        {
            "id": "baseline",
            "name": "Baseline (no changes)",
            "description": "Runs the current setup without modifications.",
            "overrides": SimulationOverrides(),
        },
        {
            "id": "plus_1_kitchen",
            "name": f"+1 Kitchen ({peak_label})",
            "description": f"Add one kitchen staff member during peak slot ({peak_label}).",
            "overrides": SimulationOverrides(
                staffing_changes=[
                    StaffingChange(
                        weekday=peak["weekday"],
                        daypart_id=peak["daypart_id"],
                        role="kitchen",
                        delta_staff=1,
                    )
                ]
            ),
        },
        {
            "id": "plus_1_service",
            "name": f"+1 Service ({peak_label})",
            "description": f"Add one service staff member during peak slot ({peak_label}).",
            "overrides": SimulationOverrides(
                staffing_changes=[
                    StaffingChange(
                        weekday=peak["weekday"],
                        daypart_id=peak["daypart_id"],
                        role="service",
                        delta_staff=1,
                    )
                ]
            ),
        },
        {
            "id": "price_plus_8pct",
            "name": "Price +8%",
            "description": "Increase average price by 8% (elasticity applies to demand).",
            "overrides": SimulationOverrides(
                price_change=PriceChange(type="percent", value=0.08)
            ),
        },
        {
            "id": "cut_weak_slot",
            "name": f"Cut weakest slot ({weak_label})",
            "description": f"Remove all staff from the weakest slot ({weak_label}) to simulate closing it.",
            "overrides": SimulationOverrides(
                staffing_changes=[
                    StaffingChange(
                        weekday=weak["weekday"],
                        daypart_id=weak["daypart_id"],
                        role="kitchen",
                        delta_staff=-99,
                    ),
                    StaffingChange(
                        weekday=weak["weekday"],
                        daypart_id=weak["daypart_id"],
                        role="service",
                        delta_staff=-99,
                    ),
                ]
            ),
        },
        {
            "id": "combined",
            "name": f"+1 Kitchen ({peak_label}) + Price +5%",
            "description": "Combined scenario: extra kitchen staff at peak + moderate price increase.",
            "overrides": SimulationOverrides(
                staffing_changes=[
                    StaffingChange(
                        weekday=peak["weekday"],
                        daypart_id=peak["daypart_id"],
                        role="kitchen",
                        delta_staff=1,
                    )
                ],
                price_change=PriceChange(type="percent", value=0.05),
            ),
        },
    ]


@router.post("/run")
def run_experiments(
    baseline_week_id: int,
    runs: int = 200,
    seed: int = 42,
    db: Session = Depends(get_db),
):
    """
    Run the 6 predefined BP experiments against a baseline week.

    Returns a structured comparison table with all results + deltas vs baseline.
    """
    # Validate week
    week = db.query(BaselineWeek).filter(BaselineWeek.id == baseline_week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    # Load data for auto-detecting peak/weak slots
    cells_db = (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == baseline_week_id)
        .all()
    )
    if not cells_db:
        raise HTTPException(status_code=400, detail="No baseline data for this week")

    staffing_db = db.query(StaffingPlan).all()
    dayparts_db = db.query(Daypart).all()

    experiments = _build_experiments(cells_db, staffing_db, dayparts_db)

    results = []
    baseline_result = None

    for exp in experiments:
        sim_req = SimulationRunRequest(
            baseline_week_id=baseline_week_id,
            runs=runs,
            seed=seed,
            overrides=exp["overrides"],
        )
        sim_output = run_sim(sim_req, db)
        summary = sim_output["result"]

        entry = {
            "id": exp["id"],
            "name": exp["name"],
            "description": exp["description"],
            "overrides": exp["overrides"].model_dump(),
            "summary": summary,
        }

        if exp["id"] == "baseline":
            baseline_result = summary
            entry["deltas"] = None
        else:
            # Compute deltas vs baseline
            if baseline_result:
                deltas = {}
                for metric in ["revenue", "profit", "served_groups", "lost_groups",
                               "avg_wait_food", "p90_wait_food", "util_kitchen"]:
                    b_val = baseline_result.get(metric, {}).get("mean", 0)
                    s_val = summary.get(metric, {}).get("mean", 0)
                    deltas[metric] = {
                        "baseline": round(b_val, 2),
                        "scenario": round(s_val, 2),
                        "delta": round(s_val - b_val, 2),
                        "delta_pct": round(((s_val - b_val) / b_val * 100) if b_val else 0, 2),
                    }
                entry["deltas"] = deltas
            else:
                entry["deltas"] = None

        results.append(entry)

    return {
        "baseline_week_id": baseline_week_id,
        "week_start": week.week_start,
        "runs_per_experiment": runs,
        "seed": seed,
        "experiment_count": len(results),
        "experiments": results,
    }
