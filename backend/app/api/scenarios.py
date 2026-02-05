from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.baseline_week import BaselineWeek
from app.models.simulation_scenario import SimulationScenario
from app.schemas.scenarios import ScenarioCreate, ScenarioOut, ScenarioRunRequest

from app.schemas.simulation import SimulationRunRequest  # reuse existing
from app.api.simulation import run_simulation  # reuse handler

router = APIRouter(tags=["scenarios"])

@router.get("/baseline-weeks/{week_id}/scenarios", response_model=list[ScenarioOut])
def list_scenarios(week_id: int, db: Session = Depends(get_db)):
    week = db.query(BaselineWeek).filter(BaselineWeek.id == week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    items = (
        db.query(SimulationScenario)
        .filter(SimulationScenario.baseline_week_id == week_id)
        .order_by(SimulationScenario.id.desc())
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

@router.post("/scenarios/{scenario_id}/run")
def run_saved_scenario(scenario_id: int, req: ScenarioRunRequest, db: Session = Depends(get_db)):
    s = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if s is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Reuse /simulation/run logic by calling it with constructed SimulationRunRequest
    sim_req = SimulationRunRequest(
        baseline_week_id=s.baseline_week_id,
        runs=req.runs,
        seed=req.seed,
        arrivals_sigma=req.arrivals_sigma,
        spend_sigma=req.spend_sigma,
        overrides=s.get_params(),
    )

    return run_simulation(sim_req, db)