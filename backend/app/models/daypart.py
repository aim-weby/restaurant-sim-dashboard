from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class Daypart(Base):
    __tablename__ = "dayparts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Např. "Lunch", "Dinner"
    label: Mapped[str] = mapped_column(String, nullable=False)

    # Časy ve formátu "HH:MM" (BP MVP – jednoduché)
    start_time: Mapped[str] = mapped_column(String, nullable=False)
    end_time: Mapped[str] = mapped_column(String, nullable=False)

    # pořadí ve UI
    sort_order: Mapped[int] = mapped_column(Integer, default=0)