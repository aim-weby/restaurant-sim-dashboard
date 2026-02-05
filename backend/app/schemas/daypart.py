from pydantic import BaseModel, Field

class DaypartOut(BaseModel):
    id: int
    label: str
    start_time: str
    end_time: str
    sort_order: int

    class Config:
        from_attributes = True

class DaypartCreate(BaseModel):
    label: str = Field(min_length=1, max_length=50)
    start_time: str = Field(min_length=4, max_length=5)  # "HH:MM"
    end_time: str = Field(min_length=4, max_length=5)
    sort_order: int = 0

class DaypartUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=50)
    start_time: str | None = Field(default=None, min_length=4, max_length=5)
    end_time: str | None = Field(default=None, min_length=4, max_length=5)
    sort_order: int | None = None