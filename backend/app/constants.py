"""
Shared constants used across the backend application.

This module serves as the **single source of truth** for constant values
that are referenced by multiple API modules. Centralising them here
eliminates duplication and reduces the risk of inconsistencies.

Consumers:
    - ``app.api.experiments`` — uses WEEKDAY_LABELS for response formatting
    - ``app.api.opening_hours`` — uses WEEKDAY_LABELS for weekday_label field
"""

# ISO weekday labels (Monday = index 0 … Sunday = index 6).
# Matches the frontend's WEEKDAYS constant in utils/format.ts.
WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
