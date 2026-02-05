from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class StaffingDelta(BaseModel):
    weekday: int = Field(ge=0, le=6)
    daypart_id: int
    role: str
    staff_count_delta: int = 0  # +1, -1, ...

class SimulationOverrides(BaseModel):
    arrivals_multiplier: float = Field(default=1.0, ge=0, le=3)
    spend_multiplier: float = Field(default=1.0, ge=0, le=3)

    food_cost_pct_override: Optional[float] = Field(default=None, ge=0, le=1)
    fixed_cost_week_override: Optional[float] = Field(default=None, ge=0)

    staffing_delta: List[StaffingDelta] = Field(default_factory=list)

class SimulationRunRequest(BaseModel):
    baseline_week_id: int
    runs: int = Field(default=200, ge=10, le=5000)
    seed: int | None = None
    arrivals_sigma: float = Field(default=0.20, ge=0, le=1)
    spend_sigma: float = Field(default=0.10, ge=0, le=1)

    overrides: SimulationOverrides = Field(default_factory=SimulationOverrides)