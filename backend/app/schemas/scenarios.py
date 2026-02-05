from pydantic import BaseModel

class ScenarioCreate(BaseModel):
    name: str
    params: dict

class ScenarioOut(BaseModel):
    id: int
    baseline_week_id: int
    name: str
    created_at: str
    params: dict

    class Config:
        from_attributes = True

class ScenarioRunRequest(BaseModel):
    runs: int = 300
    seed: int | None = None
    arrivals_sigma: float = 0.20
    spend_sigma: float = 0.10