from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.staffing_plan import StaffingPlan
from app.models.daypart import Daypart
from app.schemas.staffing import StaffingRowOut, StaffingUpsert

router = APIRouter(prefix="/staffing", tags=["staffing"])

@router.get("", response_model=list[StaffingRowOut])
def list_staffing(db: Session = Depends(get_db)):
    return db.query(StaffingPlan).order_by(StaffingPlan.weekday.asc(), StaffingPlan.daypart_id.asc(), StaffingPlan.role.asc()).all()

@router.put("", response_model=list[StaffingRowOut])
def upsert_staffing(payload: list[StaffingUpsert], db: Session = Depends(get_db)):
    # basic validation: dayparts exist
    daypart_ids = {d.id for d in db.query(Daypart).all()}
    for item in payload:
        if item.daypart_id not in daypart_ids:
            raise HTTPException(status_code=400, detail=f"Invalid daypart_id {item.daypart_id}")

    updated: list[StaffingPlan] = []
    for item in payload:
        row = (
            db.query(StaffingPlan)
            .filter(
                StaffingPlan.weekday == item.weekday,
                StaffingPlan.daypart_id == item.daypart_id,
                StaffingPlan.role == item.role,
            )
            .first()
        )
        if row is None:
            row = StaffingPlan(
                weekday=item.weekday,
                daypart_id=item.daypart_id,
                role=item.role,
                staff_count=item.staff_count,
                hourly_rate=item.hourly_rate,
                hours_in_daypart=item.hours_in_daypart,
            )
            db.add(row)
        else:
            row.staff_count = item.staff_count
            row.hourly_rate = item.hourly_rate
            row.hours_in_daypart = item.hours_in_daypart
            db.add(row)

        updated.append(row)

    db.commit()
    for r in updated:
        db.refresh(r)
    return updated