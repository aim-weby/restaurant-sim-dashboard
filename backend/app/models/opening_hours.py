from sqlalchemy import Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OpeningHours(Base):
    __tablename__ = "opening_hours"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    weekday: Mapped[int] = mapped_column(Integer, unique=True)  # 0=Mon .. 6=Sun
    open_time: Mapped[str] = mapped_column(String, default="11:00")   # HH:MM
    close_time: Mapped[str] = mapped_column(String, default="22:00")  # HH:MM
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)
