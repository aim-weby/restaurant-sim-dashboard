from sqlalchemy import Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SimulationParams(Base):
    __tablename__ = "simulation_params"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    baseline_week_id: Mapped[int] = mapped_column(Integer, ForeignKey("baseline_weeks.id"), nullable=False, unique=True)

    # Triangular: prep time (kitchen) in minutes
    prep_time_min: Mapped[float] = mapped_column(Float, default=5.0)
    prep_time_mode: Mapped[float] = mapped_column(Float, default=12.0)
    prep_time_max: Mapped[float] = mapped_column(Float, default=25.0)

    # Triangular: seat time (dine-in) in minutes
    seat_time_min: Mapped[float] = mapped_column(Float, default=30.0)
    seat_time_mode: Mapped[float] = mapped_column(Float, default=45.0)
    seat_time_max: Mapped[float] = mapped_column(Float, default=75.0)

    # Correlation: seat_time = base + alpha * kitchen_wait
    alpha_seat_wait: Mapped[float] = mapped_column(Float, default=0.0)

    # Balking limits (minutes); 0 = disabled
    balking_wait_table_limit: Mapped[float] = mapped_column(Float, default=0.0)
    balking_wait_food_limit: Mapped[float] = mapped_column(Float, default=0.0)

    # Price elasticity (e.g. -1.2)
    price_elasticity: Mapped[float] = mapped_column(Float, default=-1.2)

    # Demand noise ±% (e.g. 0.2 = ±20%)
    demand_noise_pct: Mapped[float] = mapped_column(Float, default=0.2)
