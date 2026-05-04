"""
Daypart CRUD API with time-range overlap validation.

This module provides REST endpoints for managing daypart definitions —
the named time slots that divide the restaurant's operating day (e.g.,
"Lunch" 11:00–14:00, "Dinner" 18:00–22:00).

Data Integrity:
    Dayparts are a **foundational configuration entity**. They are referenced
    by baseline data cells, staffing plans, and simulation slots. The overlap
    validation ensures that no two dayparts share any portion of the time axis,
    which is a precondition for the DES engine's daypart scheduling logic.

Endpoints:
    GET    /dayparts           — List all dayparts, ordered by sort_order
    POST   /dayparts           — Create a new daypart (validates overlap)
    PUT    /dayparts/{id}      — Update an existing daypart (validates overlap)
    DELETE /dayparts/{id}      — Delete a daypart
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.daypart import Daypart
from app.schemas.daypart import DaypartOut, DaypartCreate, DaypartUpdate

router = APIRouter(prefix="/dayparts", tags=["dayparts"])


def _hhmm_to_min(t: str) -> int:
    """
    Convert a time string in "HH:MM" format to minutes since midnight.

    Args:
        t: Time string (e.g., "14:30").

    Returns:
        Integer minutes since midnight (e.g., 870 for "14:30").
    """
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _check_overlap(
    db: Session,
    start_time: str,
    end_time: str,
    exclude_id: int | None = None,
) -> None:
    """
    Validate that a proposed time range does not overlap any existing daypart.

    Uses the interval overlap formula: two half-open intervals [a, b) and [c, d)
    overlap if and only if a < d AND c < b.

    Also validates that end_time > start_time (prevents zero-length or
    inverted dayparts).

    Args:
        db: SQLAlchemy database session.
        start_time: Proposed start time in "HH:MM" format.
        end_time: Proposed end time in "HH:MM" format.
        exclude_id: If updating an existing daypart, exclude it from the
            overlap check (a daypart trivially overlaps with itself).

    Raises:
        HTTPException(400): If end_time ≤ start_time or if the proposed range
            overlaps an existing daypart.
    """
    new_start = _hhmm_to_min(start_time)
    new_end = _hhmm_to_min(end_time)

    # Validate that the time range is valid (end must be after start)
    if new_end <= new_start:
        raise HTTPException(
            status_code=400,
            detail=f"End time ({end_time}) must be after start time ({start_time}).",
        )

    # Check against all existing dayparts for pairwise overlap
    existing = db.query(Daypart).all()
    for dp in existing:
        if exclude_id is not None and dp.id == exclude_id:
            continue
        ex_start = _hhmm_to_min(dp.start_time)
        ex_end = _hhmm_to_min(dp.end_time)
        # Interval overlap test: [new_start, new_end) ∩ [ex_start, ex_end) ≠ ∅
        if new_start < ex_end and ex_start < new_end:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Overlaps with '{dp.label}' ({dp.start_time}–{dp.end_time}). "
                    f"Dayparts must not overlap."
                ),
            )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[DaypartOut])
def list_dayparts(db: Session = Depends(get_db)):
    """
    List all configured dayparts, ordered by sort_order then ID.

    Returns:
        List of DaypartOut objects representing all daypart definitions.
    """
    return db.query(Daypart).order_by(Daypart.sort_order.asc(), Daypart.id.asc()).all()


@router.post("", response_model=DaypartOut, status_code=201)
def create_daypart(payload: DaypartCreate, db: Session = Depends(get_db)):
    """
    Create a new daypart with overlap validation.

    Validates that the proposed time range does not overlap any existing
    daypart before inserting. Returns HTTP 400 with a descriptive message
    if an overlap is detected.

    Args:
        payload: New daypart data (label, start_time, end_time, sort_order).

    Returns:
        The newly created DaypartOut object with assigned ID.
    """
    _check_overlap(db, payload.start_time, payload.end_time)
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
    """
    Update an existing daypart with overlap validation.

    For partial updates, computes effective times by merging the payload
    with the existing record before checking for overlaps. The daypart
    being updated is excluded from the overlap check.

    Args:
        daypart_id: Primary key of the daypart to update.
        payload: Partial update data (any field may be None = unchanged).

    Returns:
        The updated DaypartOut object.

    Raises:
        HTTPException(404): If the daypart does not exist.
        HTTPException(400): If the updated time range overlaps another daypart.
    """
    dp = db.query(Daypart).filter(Daypart.id == daypart_id).first()
    if dp is None:
        raise HTTPException(status_code=404, detail="Daypart not found")

    # Compute effective start/end times for validation (use existing values
    # for any fields not included in the update payload)
    eff_start = payload.start_time if payload.start_time is not None else dp.start_time
    eff_end = payload.end_time if payload.end_time is not None else dp.end_time
    _check_overlap(db, eff_start, eff_end, exclude_id=daypart_id)

    # Apply partial updates — only modify fields that are explicitly provided
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
    """
    Permanently delete a daypart.

    Warning: Existing baseline data cells and staffing plan entries that
    reference this daypart_id will become orphaned.

    Args:
        daypart_id: Primary key of the daypart to delete.

    Raises:
        HTTPException(404): If the daypart does not exist.
    """
    dp = db.query(Daypart).filter(Daypart.id == daypart_id).first()
    if dp is None:
        raise HTTPException(status_code=404, detail="Daypart not found")

    db.delete(dp)
    db.commit()
    return None