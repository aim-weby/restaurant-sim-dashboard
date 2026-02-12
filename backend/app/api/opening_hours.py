"""
CRUD for venue opening hours (Mon-Sun).
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.opening_hours import OpeningHours

router = APIRouter(prefix="/opening-hours", tags=["opening-hours"])

WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class OpeningHoursItem(BaseModel):
    weekday: int = Field(ge=0, le=6)
    open_time: str = "11:00"
    close_time: str = "22:00"
    is_closed: bool = False


class OpeningHoursOut(OpeningHoursItem):
    id: int
    weekday_label: str = ""


@router.get("")
def list_opening_hours(db: Session = Depends(get_db)) -> list[OpeningHoursOut]:
    """Return all 7 weekdays. Creates defaults if empty."""
    existing = db.query(OpeningHours).order_by(OpeningHours.weekday).all()

    if len(existing) < 7:
        # Seed missing days with defaults
        existing_days = {e.weekday for e in existing}
        for wd in range(7):
            if wd not in existing_days:
                row = OpeningHours(weekday=wd, open_time="11:00", close_time="22:00", is_closed=False)
                db.add(row)
        db.commit()
        existing = db.query(OpeningHours).order_by(OpeningHours.weekday).all()

    return [
        OpeningHoursOut(
            id=r.id,
            weekday=r.weekday,
            open_time=r.open_time,
            close_time=r.close_time,
            is_closed=r.is_closed,
            weekday_label=WEEKDAY_LABELS[r.weekday],
        )
        for r in existing
    ]


@router.put("")
def upsert_opening_hours(
    items: list[OpeningHoursItem],
    db: Session = Depends(get_db),
) -> list[OpeningHoursOut]:
    """Bulk upsert all 7 weekdays."""
    for item in items:
        row = db.query(OpeningHours).filter(OpeningHours.weekday == item.weekday).first()
        if row:
            row.open_time = item.open_time
            row.close_time = item.close_time
            row.is_closed = item.is_closed
        else:
            row = OpeningHours(
                weekday=item.weekday,
                open_time=item.open_time,
                close_time=item.close_time,
                is_closed=item.is_closed,
            )
            db.add(row)
    db.commit()

    return list_opening_hours(db)
