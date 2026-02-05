from sqlalchemy import Integer, String, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class BaselineWeek(Base):
    __tablename__ = "baseline_weeks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # pondělí daného týdne
    week_start: Mapped[str] = mapped_column(String, nullable=False)  # "YYYY-MM-DD" (MVP)
    label: Mapped[str] = mapped_column(String, default="Baseline week")