from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.baseline_week import BaselineWeek
from app.models.baseline_daypart_data import BaselineDaypartData
from app.models.daypart import Daypart
from app.schemas.baseline import (
    BaselineWeekOut, BaselineWeekCreate, BaselineWeekUpdate,
    BaselineCellOut, BaselineCellUpsert
)

router = APIRouter(prefix="/baseline-weeks", tags=["baseline"])

# ---- Weeks ----
@router.get("", response_model=list[BaselineWeekOut])
def list_weeks(db: Session = Depends(get_db)):
    return db.query(BaselineWeek).order_by(BaselineWeek.id.desc()).all()

@router.post("", response_model=BaselineWeekOut, status_code=201)
def create_week(payload: BaselineWeekCreate, db: Session = Depends(get_db)):
    week = BaselineWeek(week_start=payload.week_start, label=payload.label)
    db.add(week)
    db.commit()
    db.refresh(week)
    return week

@router.put("/{week_id}", response_model=BaselineWeekOut)
def update_week(week_id: int, payload: BaselineWeekUpdate, db: Session = Depends(get_db)):
    week = db.query(BaselineWeek).filter(BaselineWeek.id == week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")
    if payload.label is not None:
        week.label = payload.label
    db.add(week)
    db.commit()
    db.refresh(week)
    return week

# ---- Grid cells ----
@router.get("/{week_id}/data", response_model=list[BaselineCellOut])
def get_week_data(week_id: int, db: Session = Depends(get_db)):
    # return all stored cells (not auto-filled)
    return (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == week_id)
        .all()
    )

@router.put("/{week_id}/data", response_model=list[BaselineCellOut])
def upsert_week_data(week_id: int, payload: list[BaselineCellUpsert], db: Session = Depends(get_db)):
    # ensure week exists
    week = db.query(BaselineWeek).filter(BaselineWeek.id == week_id).first()
    if week is None:
        raise HTTPException(status_code=404, detail="Baseline week not found")

    # ensure dayparts exist (basic check)
    daypart_ids = {d.id for d in db.query(Daypart).all()}
    for item in payload:
        if item.daypart_id not in daypart_ids:
            raise HTTPException(status_code=400, detail=f"Invalid daypart_id {item.daypart_id}")

    updated_rows: list[BaselineDaypartData] = []

    for item in payload:
        row = (
            db.query(BaselineDaypartData)
            .filter(
                BaselineDaypartData.baseline_week_id == week_id,
                BaselineDaypartData.weekday == item.weekday,
                BaselineDaypartData.daypart_id == item.daypart_id,
            )
            .first()
        )
        if row is None:
            row = BaselineDaypartData(
                baseline_week_id=week_id,
                weekday=item.weekday,
                daypart_id=item.daypart_id,
                arrivals_groups=item.arrivals_groups,
                avg_spend_per_group=item.avg_spend_per_group,
                avg_party_size=item.avg_party_size,
            )
            db.add(row)
        else:
            row.arrivals_groups = item.arrivals_groups
            row.avg_spend_per_group = item.avg_spend_per_group
            row.avg_party_size = item.avg_party_size
            db.add(row)

        updated_rows.append(row)

    db.commit()

    # refresh rows
    for r in updated_rows:
        db.refresh(r)

    return updated_rows

@router.get("/{week_id}/kpis")
def get_week_kpis(week_id: int, db: Session = Depends(get_db)):
    # Načti všechny uložené buňky
    rows = (
        db.query(BaselineDaypartData)
        .filter(BaselineDaypartData.baseline_week_id == week_id)
        .all()
    )

    revenue = 0.0
    arrivals_total = 0

    for r in rows:
        arrivals_total += r.arrivals_groups
        revenue += r.arrivals_groups * r.avg_spend_per_group

    # prozatím: jen finance.revenue a demand.arrivals_groups
    return {
        "baseline_week_id": week_id,
        "kpis": {
            "finance.revenue": revenue,
            "demand.arrivals_groups": arrivals_total
        }
    }