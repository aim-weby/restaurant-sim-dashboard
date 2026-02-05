from pydantic import BaseModel, Field

# --------- Baseline Week ---------
class BaselineWeekOut(BaseModel):
    id: int
    week_start: str
    label: str

    class Config:
        from_attributes = True

class BaselineWeekCreate(BaseModel):
    week_start: str = Field(min_length=10, max_length=10)  # "YYYY-MM-DD"
    label: str = Field(default="Baseline week", min_length=1, max_length=100)

class BaselineWeekUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=100)

# --------- Baseline Daypart Data ---------
class BaselineCellOut(BaseModel):
    id: int
    baseline_week_id: int
    weekday: int
    daypart_id: int
    arrivals_groups: int
    avg_spend_per_group: float
    avg_party_size: float

    class Config:
        from_attributes = True

class BaselineCellUpsert(BaseModel):
    weekday: int = Field(ge=0, le=6)
    daypart_id: int
    arrivals_groups: int = Field(ge=0)
    avg_spend_per_group: float = Field(ge=0)
    avg_party_size: float = Field(ge=0)