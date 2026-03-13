"""
DuckDB-backed dataset loader with in-process parse cache.

Replaces parse_csv for API serving. DuckDB scans the CSV in parallel
and handles date parsing, type casting, and location splitting natively.

The full parsed record list is cached in memory keyed by (path, mtime).
The startDate filter is applied against the cache in Python, so date-range
changes don't trigger a re-scan — only file changes do.
"""

import os
from datetime import date
from pathlib import Path

import duckdb

from .schema import Record

# {str(csv_path): (mtime_float, list[Record])}
_CACHE: dict[str, tuple[float, list[Record]]] = {}


def load_records(
    csv_path: Path,
    columns: dict,
    start_date: date | None = None,
) -> list[Record]:
    """
    Return records for csv_path. Scans with DuckDB on first call or when
    the file has changed; subsequent calls with the same mtime return cached
    results immediately.

    start_date is applied against the cache in Python — not baked into the
    cache key — so changing the date window never causes a re-scan.
    """
    key = str(csv_path)
    mtime = os.path.getmtime(csv_path)

    if key not in _CACHE or _CACHE[key][0] != mtime:
        _CACHE[key] = (mtime, _scan(csv_path, columns))

    records = _CACHE[key][1]
    if start_date:
        records = [r for r in records if r.date >= start_date]
    return records


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _resolve(headers: list[str], spec) -> str | None:
    """Return the first header name that matches spec (str or list[str])."""
    for name in ([spec] if isinstance(spec, str) else spec):
        if name in headers:
            return name
    return None


def _q(name: str) -> str:
    """Double-quote a column name for use in SQL."""
    return '"' + name.replace('"', '""') + '"'


def _scan(csv_path: Path, columns: dict) -> list[Record]:
    """Scan csv_path with DuckDB and return all valid Records (no date filter)."""
    con = duckdb.connect()
    escaped = str(csv_path).replace("'", "''")

    # Discover headers without loading data
    headers = [
        d[0] for d in
        con.execute(
            f"SELECT * FROM read_csv('{escaped}', header=true, all_varchar=true) LIMIT 0"
        ).description
    ]

    col = {k: _resolve(headers, v) for k, v in columns.items()}

    # Build expressions for each field
    x_expr  = f"TRY_CAST({_q(col['x'])}  AS DOUBLE)"  if col.get("x")       else "0.0"
    y_expr  = f"TRY_CAST({_q(col['y'])}  AS DOUBLE)"  if col.get("y")       else "0.0"
    z_expr  = f"TRY_CAST({_q(col['z'])}  AS DOUBLE)"  if col.get("z")       else "0.0"
    cl_expr = f"TRY_CAST({_q(col['cluster'])} AS INTEGER)" if col.get("cluster") else "-1"
    ti_expr = _q(col["title"])     if col.get("title")     else "NULL"
    ty_expr = _q(col["type"])      if col.get("type")      else "NULL"
    ur_expr = _q(col["url"])       if col.get("url")       else "NULL"

    if col.get("locations"):
        # Split on ' | ' (with spaces), matching _parse_pipe_list behaviour
        lc_expr = f"string_split(TRIM({_q(col['locations'])}), ' | ')"
    else:
        lc_expr = "[]"

    if col.get("date"):
        dc = _q(col["date"])
        # Accept both MM/DD/YYYY and ISO YYYY-MM-DD; cast to DATE
        dt_expr = (
            f"COALESCE("
            f"  TRY_STRPTIME({dc}, '%m/%d/%Y'),"
            f"  TRY_STRPTIME({dc}, '%Y-%m-%d'),"
            f"  TRY_STRPTIME({dc}, '%Y/%m/%d %H:%M:%S'),"
            f"  TRY_STRPTIME({dc}, '%Y/%m/%d')"
            f")::DATE"
        )
    else:
        dt_expr = "NULL"

    sql = f"""
        WITH raw AS (
            SELECT
                COALESCE({x_expr},  0.0)        AS x,
                COALESCE({y_expr},  0.0)        AS y,
                COALESCE({z_expr},  0.0)        AS z,
                COALESCE({ti_expr}, 'Untitled') AS title,
                {dt_expr}                       AS date,
                COALESCE({ty_expr}, 'Unknown')  AS type,
                COALESCE({cl_expr}, -1)         AS cluster,
                COALESCE({ur_expr}, '')         AS url,
                {lc_expr}                       AS locations
            FROM read_csv('{escaped}', header=true, all_varchar=true)
        )
        SELECT * FROM raw WHERE date IS NOT NULL
    """

    rows = con.execute(sql).fetchall()

    records = []
    for x, y, z, title, date_val, type_, cluster, url, locations in rows:
        records.append(Record(
            x=float(x or 0),
            y=float(y or 0),
            z=float(z or 0),
            title=title or "Untitled",
            date=date_val,
            type=type_ or "Unknown",
            cluster=int(cluster) if cluster is not None else -1,
            url=url or "",
            locations=[loc.strip() for loc in (locations or []) if loc and loc.strip()],
        ))

    return records
