from pydantic import BaseModel, Field

class SimulationRunRequest(BaseModel):
    baseline_week_id: int
    runs: int = Field(default=200, ge=10, le=5000)
    seed: int | None = None
    arrivals_sigma: float = Field(default=0.20, ge=0, le=1)
    spend_sigma: float = Field(default=0.10, ge=0, le=1)