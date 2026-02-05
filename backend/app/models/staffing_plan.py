from sqlalchemy import Integer, Float, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class StaffingPlan(Base):
    __tablename__ = "staffing_plan"
    __table_args__ = (
        UniqueConstraint("weekday", "daypart_id", "role", name="uq_staff_weekday_daypart_role"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0..6
    daypart_id: Mapped[int] = mapped_column(ForeignKey("dayparts.id"), nullable=False)

    role: Mapped[str] = mapped_column(String, nullable=False)  # "kitchen" | "service"
    staff_count: Mapped[int] = mapped_column(Integer, default=0)

    hourly_rate: Mapped[float] = mapped_column(Float, default=0.0)
    hours_in_daypart: Mapped[float] = mapped_column(Float, default=0.0)