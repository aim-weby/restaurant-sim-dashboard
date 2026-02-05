from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
import json

from app.db.base import Base

class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    baseline_week_id: Mapped[int] = mapped_column(ForeignKey("baseline_weeks.id"), nullable=False)

    name: Mapped[str] = mapped_column(String, nullable=False, default="Scenario")
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())

    params_json: Mapped[str] = mapped_column(String, nullable=False, default="{}")

    def get_params(self) -> dict:
        try:
            return json.loads(self.params_json)
        except Exception:
            return {}

    def set_params(self, params: dict) -> None:
        self.params_json = json.dumps(params)