from pydantic import BaseModel, Field


class SimulationParamsIn(BaseModel):
    prep_time_min: float = Field(5.0, ge=0)
    prep_time_mode: float = Field(12.0, ge=0)
    prep_time_max: float = Field(25.0, ge=0)

    seat_time_min: float = Field(30.0, ge=0)
    seat_time_mode: float = Field(45.0, ge=0)
    seat_time_max: float = Field(75.0, ge=0)

    alpha_seat_wait: float = Field(0.0, ge=0, le=1.0)

    balking_wait_table_limit: float = Field(0.0, ge=0)
    balking_wait_food_limit: float = Field(0.0, ge=0)

    price_elasticity: float = Field(-1.2)
    demand_noise_pct: float = Field(0.2, ge=0, le=1.0)


class SimulationParamsOut(SimulationParamsIn):
    id: int
    baseline_week_id: int

    class Config:
        from_attributes = True
