"""Serialize DB datetimes for JSON/WebSocket so browsers parse them as absolute instants."""

from __future__ import annotations

from datetime import datetime, timezone


def to_iso_utc_z(value: datetime | None) -> str | None:
    """UTC ISO-8601 with ``Z`` suffix. Naive values are interpreted as UTC (typical for Postgres without tz)."""
    if value is None:
        return None
    if value.tzinfo is None:
        dt = value.replace(tzinfo=timezone.utc)
    else:
        dt = value.astimezone(timezone.utc)
    s = dt.isoformat()
    if s.endswith("+00:00"):
        return s[:-6] + "Z"
    if s.endswith("-00:00"):
        return s[:-6] + "Z"
    return s
