from pydantic import BaseModel, Field

class StaffingRowOut(BaseModel):
    id: int
    weekday: int
    daypart_id: int
    role: str
    staff_count: int
    hourly_rate: float
    hours_in_daypart: float

    class Config:
        from_attributes = True

class StaffingUpsert(BaseModel):
    weekday: int = Field(ge=0, le=6)
    daypart_id: int
    role: str  # "kitchen" | "service"
    staff_count: int = Field(ge=0)
    hourly_rate: float = Field(ge=0)
    hours_in_daypart: float = Field(ge=0)