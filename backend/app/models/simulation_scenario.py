from sqlalchemy import Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.db.base import Base

class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    baseline_week_id: Mapped[int] = mapped_column(ForeignKey("baseline_weeks.id"), nullable=False)

    name: Mapped[str] = mapped_column(String, default="Scenario")
    created_at: Mapped[str] = mapped_column(String, default=lambda: datetime.utcnow().isoformat())

    # JSON string (MVP) – parametry scénáře
    params_json: Mapped[str] = mapped_column(String, default="{}")