"""
CSV parser for semantic-toolkit datasets.

Handles:
- RFC-4180 quoted fields (commas inside quotes, escaped quotes)
- Pipe-separated multi-values (event_locations: "SF | EG | KE")
- Column aliasing (title / text_name fallback chains)
- Date parsing (MM/DD/YYYY)
- Start-date filtering
"""

import csv
from datetime import date, datetime
from pathlib import Path
from typing import Iterator

from .schema import Record


def _resolve_column(headers: list[str], spec) -> int:
    """
    Return the index of the first matching column name.
    spec may be a string or a list of fallback strings.
    Returns -1 if not found.
    """
    candidates = [spec] if isinstance(spec, str) else spec
    for name in candidates:
        if name in headers:
            return headers.index(name)
    return -1


def _parse_date(s: str) -> date | None:
    """Parse MM/DD/YYYY → date. Returns None on failure."""
    s = s.strip()
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_pipe_list(s: str) -> list[str]:
    """Split 'SF | EG | KE' → ['SF', 'EG', 'KE']. Returns [] for blank."""
    if not s or not s.strip():
        return []
    return [part.strip() for part in s.split("|") if part.strip()]


def parse_csv(
    csv_path: Path,
    columns: dict,
    start_date: date | None = None,
) -> list[Record]:
    """
    Parse a dataset CSV into a list of Records.

    Args:
        csv_path:   Path to the CSV file.
        columns:    Column mapping from config (see load_config.DEFAULTS).
        start_date: If provided, exclude records before this date.
    """
    records = []

    with open(csv_path, encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.reader(f)
        raw_headers = next(reader)
        headers = [h.strip() for h in raw_headers]

        # Resolve column indices from config mapping
        idx = {
            key: _resolve_column(headers, spec)
            for key, spec in columns.items()
        }

        for row in reader:
            if len(row) < 2:
                continue

            # Date — required; skip if missing or before start_date
            date_val = None
            if idx.get("date", -1) >= 0 and idx["date"] < len(row):
                date_val = _parse_date(row[idx["date"]])
            if date_val is None:
                continue
            if start_date and date_val < start_date:
                continue

            def get(key, default=""):
                i = idx.get(key, -1)
                if i < 0 or i >= len(row):
                    return default
                return row[i].strip()

            # Numeric fields
            try:
                x = float(get("x", "0") or "0")
                y = float(get("y", "0") or "0")
                z = float(get("z", "0") or "0")
            except ValueError:
                x = y = z = 0.0

            try:
                cluster = int(get("cluster", "-1") or "-1")
            except ValueError:
                cluster = -1

            records.append(Record(
                x=x,
                y=y,
                z=z,
                title=get("title") or "Untitled",
                date=date_val,
                type=get("type") or "Unknown",
                cluster=cluster,
                url=get("url"),
                locations=_parse_pipe_list(get("locations")),
            ))

    return records
