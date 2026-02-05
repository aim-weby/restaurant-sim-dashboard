from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.daypart import Daypart
from app.schemas.daypart import DaypartOut, DaypartCreate, DaypartUpdate

router = APIRouter(prefix="/dayparts", tags=["dayparts"])

@router.get("", response_model=list[DaypartOut])
def list_dayparts(db: Session = Depends(get_db)):
    return db.query(Daypart).order_by(Daypart.sort_order.asc(), Daypart.id.asc()).all()

@router.post("", response_model=DaypartOut, status_code=201)
def create_daypart(payload: DaypartCreate, db: Session = Depends(get_db)):
    dp = Daypart(
        label=payload.label,
        start_time=payload.start_time,
        end_time=payload.end_time,
        sort_order=payload.sort_order,
    )
    db.add(dp)
    db.commit()
    db.refresh(dp)
    return dp

@router.put("/{daypart_id}", response_model=DaypartOut)
def update_daypart(daypart_id: int, payload: DaypartUpdate, db: Session = Depends(get_db)):
    dp = db.query(Daypart).filter(Daypart.id == daypart_id).first()
    if dp is None:
        raise HTTPException(status_code=404, detail="Daypart not found")

    if payload.label is not None:
        dp.label = payload.label
    if payload.start_time is not None:
        dp.start_time = payload.start_time
    if payload.end_time is not None:
        dp.end_time = payload.end_time
    if payload.sort_order is not None:
        dp.sort_order = payload.sort_order

    db.add(dp)
    db.commit()
    db.refresh(dp)
    return dp

@router.delete("/{daypart_id}", status_code=204)
def delete_daypart(daypart_id: int, db: Session = Depends(get_db)):
    dp = db.query(Daypart).filter(Daypart.id == daypart_id).first()
    if dp is None:
        raise HTTPException(status_code=404, detail="Daypart not found")

    db.delete(dp)
    db.commit()
    return None