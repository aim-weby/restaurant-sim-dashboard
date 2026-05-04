from sqlalchemy import text
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.venue import VenueSettings
from app.schemas.venue import VenueSettingsOut, VenueSettingsUpdate

router = APIRouter(prefix="/venue", tags=["venue"])

def get_or_create_venue(db: Session) -> VenueSettings:
    venue = db.query(VenueSettings).first()
    if venue is None:
        venue = VenueSettings()
        db.add(venue)
        db.execute(text("UPDATE baseline_weeks SET kpis_cache_json = NULL")); db.commit()
        db.refresh(venue)
    return venue

@router.get("", response_model=VenueSettingsOut)
def get_venue(db: Session = Depends(get_db)):
    return get_or_create_venue(db)

@router.put("", response_model=VenueSettingsOut)
def update_venue(payload: VenueSettingsUpdate, db: Session = Depends(get_db)):
    venue = get_or_create_venue(db)

    venue.name = payload.name
    venue.seats_total = payload.seats_total
    venue.tables_count = payload.tables_count
    venue.mode = payload.mode

    db.add(venue)
    db.execute(text("UPDATE baseline_weeks SET kpis_cache_json = NULL")); db.commit()
    db.refresh(venue)
    return venue