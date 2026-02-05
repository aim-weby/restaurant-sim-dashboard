from app.db.session import engine
from app.db.base import Base

def init_db() -> None:
    # Import modelů sem, aby se zaregistrovaly do Base.metadata
    from app.models.venue import VenueSettings  # noqa: F401
    from app.models.venue import VenueSettings  # noqa: F401
    from app.models.daypart import Daypart  # noqa: F401
    from app.models.baseline_week import BaselineWeek  # noqa: F401
    from app.models.baseline_daypart_data import BaselineDaypartData  # noqa: F401
    from app.models.cost_settings import CostSettings  # noqa: F401
    from app.models.staffing_plan import StaffingPlan  # noqa: F401

    Base.metadata.create_all(bind=engine)