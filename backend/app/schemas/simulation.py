from pydantic import BaseModel, Field
from typing import Optional, List


class StaffingChange(BaseModel):
    """One staffing delta: add/remove staff for a specific slot."""
    weekday: int = Field(ge=0, le=6)
    daypart_id: int
    role: str  # "kitchen" | "service"
    delta_staff: int = 0  # +1, -1, ...


class PriceChange(BaseModel):
    """Price change applied via elasticity to demand."""
    type: str = "percent"  # "percent" | "absolute"
    value: float = 0.0     # e.g. 0.08 = +8%


class CapacityChanges(BaseModel):
    """Delta on venue capacity."""
    tables_count: int = 0  # e.g. +2
    seats_total: int = 0   # e.g. +8


class OpeningHoursChange(BaseModel):
    """Override opening hours for a weekday (future extension)."""
    weekday: int = Field(ge=0, le=6)
    open_time: str = "11:00"   # HH:MM
    close_time: str = "23:00"  # HH:MM


class SimulationOverrides(BaseModel):
    """Spec-aligned scenario overrides."""
    # --- Spec fields ---
    staffing_changes: List[StaffingChange] = Field(default_factory=list)
    price_change: Optional[PriceChange] = None
    capacity_changes: Optional[CapacityChanges] = None
    opening_hours_changes: List[OpeningHoursChange] = Field(default_factory=list)

    # --- Legacy/convenience fields (kept for backward compat) ---
    arrivals_multiplier: float = Field(default=1.0, ge=0, le=3)
    spend_multiplier: float = Field(default=1.0, ge=0, le=3)
    food_cost_pct_override: Optional[float] = Field(default=None, ge=0, le=1)
    fixed_cost_week_override: Optional[float] = Field(default=None, ge=0)


class SimulationRunRequest(BaseModel):
    baseline_week_id: int
    runs: int = Field(default=1000, ge=10, le=5000)
    seed: int | None = None

    overrides: SimulationOverrides = Field(default_factory=SimulationOverrides)