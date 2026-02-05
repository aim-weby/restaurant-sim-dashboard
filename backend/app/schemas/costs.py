from pydantic import BaseModel, Field

class CostSettingsOut(BaseModel):
    id: int
    fixed_cost_week: float
    food_cost_pct: float

    class Config:
        from_attributes = True

class CostSettingsUpdate(BaseModel):
    fixed_cost_week: float = Field(default=0, ge=0)
    food_cost_pct: float = Field(default=0.30, ge=0, le=1)