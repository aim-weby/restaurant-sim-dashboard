from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class VenueSettings(Base):
    __tablename__ = "venue_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String, default="My Venue")

    seats_total: Mapped[int] = mapped_column(Integer, default=40)
    tables_count: Mapped[int] = mapped_column(Integer, default=10)

    # BP MVP: dinein / delivery_only
    mode: Mapped[str] = mapped_column(String, default="dinein")