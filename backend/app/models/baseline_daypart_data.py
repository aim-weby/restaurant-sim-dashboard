from sqlalchemy import Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class BaselineDaypartData(Base):
    __tablename__ = "baseline_daypart_data"
    __table_args__ = (
        UniqueConstraint("baseline_week_id", "weekday", "daypart_id", name="uq_baseline_weekday_daypart"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    baseline_week_id: Mapped[int] = mapped_column(ForeignKey("baseline_weeks.id"), nullable=False)
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon ... 6=Sun
    daypart_id: Mapped[int] = mapped_column(ForeignKey("dayparts.id"), nullable=False)

    arrivals_groups: Mapped[int] = mapped_column(Integer, default=0)
    avg_spend_per_group: Mapped[float] = mapped_column(Float, default=0.0)
    avg_party_size: Mapped[float] = mapped_column(Float, default=2.0)