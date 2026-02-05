from sqlalchemy import Integer, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class CostSettings(Base):
    __tablename__ = "cost_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    fixed_cost_week: Mapped[float] = mapped_column(Float, default=0.0)
    food_cost_pct: Mapped[float] = mapped_column(Float, default=0.30)  # 0.30 = 30%