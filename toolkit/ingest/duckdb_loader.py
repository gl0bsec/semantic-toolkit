"""
DuckDB-backed dataset loader with in-process parse cache.

Supports two source types:
  - CSV files  (Path argument — scanned via read_csv)
  - DuckDB databases  (dict argument — queried from an existing .duckdb file)

The full parsed record list is cached in memory keyed by source identity and
file mtime.  The startDate filter is applied against the cache in Python, so
date-range changes don't trigger a re-scan — only file changes do.
"""

import os
from datetime import date
from pathlib import Path

import duckdb

from .schema import Record

# {cache_key: (mtime_float, list[Record])}
_CACHE: dict[str, tuple[float, list[Record]]] = {}


def load_records(
    source,
    columns: dict,
    start_date: date | None = None,
) -> list[Record]:
    """
    Return records from *source*.

    source may be:
      - a Path to a CSV file (existing behaviour), or
      - a dict with keys ``path`` (str) and ``table`` (str) pointing at
        a DuckDB database file and the table to read from.

    Results are cached by (source identity, file mtime).  start_date is
    applied in Python against the cache so changing the date window never
    triggers a re-scan.
    """
    if isinstance(source, dict):
        return _load_from_db(source, columns, start_date)

    # CSV path (original behaviour)
    key = str(source)
    mtime = os.path.getmtime(source)

    if key not in _CACHE or _CACHE[key][0] != mtime:
        _CACHE[key] = (mtime, _scan_csv(source, columns))

    records = _CACHE[key][1]
    if start_date:
        records = [r for r in records if r.date >= start_date]
    return records


# ---------------------------------------------------------------------------
# DuckDB database source
# ---------------------------------------------------------------------------

def _load_from_db(
    source: dict,
    columns: dict,
    start_date: date | None = None,
) -> list[Record]:
    db_path = source["path"]
    table = source["table"]
    key = f"{db_path}::{table}"
    mtime = os.path.getmtime(db_path)

    if key not in _CACHE or _CACHE[key][0] != mtime:
        _CACHE[key] = (mtime, _scan_table(db_path, table, columns))

    records = _CACHE[key][1]
    if start_date:
        records = [r for r in records if r.date >= start_date]
    return records


def _scan_table(db_path: str, table: str, columns: dict) -> list[Record]:
    """Open a DuckDB file read-only and scan a table into Records."""
    con = duckdb.connect(db_path, read_only=True)
    try:
        escaped_table = _q(table)
        headers = [
            d[0] for d in
            con.execute(f"SELECT * FROM {escaped_table} LIMIT 0").description
        ]
        select_expr = _build_select_exprs(headers, columns)
        sql = f"""
            WITH raw AS (
                SELECT {select_expr}
                FROM {escaped_table}
            )
            SELECT * FROM raw WHERE date IS NOT NULL
        """
        rows = con.execute(sql).fetchall()
    finally:
        con.close()
    return _rows_to_records(rows)


# ---------------------------------------------------------------------------
# CSV source
# ---------------------------------------------------------------------------

def _scan_csv(csv_path: Path, columns: dict) -> list[Record]:
    """Scan csv_path with DuckDB and return all valid Records (no date filter)."""
    con = duckdb.connect()
    escaped = str(csv_path).replace("'", "''")

    headers = [
        d[0] for d in
        con.execute(
            f"SELECT * FROM read_csv('{escaped}', header=true, all_varchar=true) LIMIT 0"
        ).description
    ]

    select_expr = _build_select_exprs(headers, columns)
    sql = f"""
        WITH raw AS (
            SELECT {select_expr}
            FROM read_csv('{escaped}', header=true, all_varchar=true)
        )
        SELECT * FROM raw WHERE date IS NOT NULL
    """

    rows = con.execute(sql).fetchall()
    return _rows_to_records(rows)


# ---------------------------------------------------------------------------
# Shared helpers
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


def _build_select_exprs(headers: list[str], columns: dict) -> str:
    """Build the SELECT column list shared by CSV and DB scan paths."""
    col = {k: _resolve(headers, v) for k, v in columns.items()}

    x_expr  = f"TRY_CAST({_q(col['x'])}  AS DOUBLE)"  if col.get("x")       else "0.0"
    y_expr  = f"TRY_CAST({_q(col['y'])}  AS DOUBLE)"  if col.get("y")       else "0.0"
    z_expr  = f"TRY_CAST({_q(col['z'])}  AS DOUBLE)"  if col.get("z")       else "0.0"
    cl_expr = f"TRY_CAST({_q(col['cluster'])} AS INTEGER)" if col.get("cluster") else "-1"
    ti_expr = _q(col["title"])     if col.get("title")     else "NULL"
    ty_expr = _q(col["type"])      if col.get("type")      else "NULL"
    ur_expr = _q(col["url"])       if col.get("url")       else "NULL"

    if col.get("locations"):
        lc_expr = f"string_split(TRIM({_q(col['locations'])}), ' | ')"
    else:
        lc_expr = "[]"

    if col.get("date"):
        dc = _q(col["date"])
        dt_expr = (
            f"COALESCE("
            f"  TRY_STRPTIME(CAST({dc} AS VARCHAR), '%m/%d/%Y'),"
            f"  TRY_STRPTIME(CAST({dc} AS VARCHAR), '%Y-%m-%d'),"
            f"  TRY_STRPTIME(CAST({dc} AS VARCHAR), '%Y/%m/%d %H:%M:%S'),"
            f"  TRY_STRPTIME(CAST({dc} AS VARCHAR), '%Y/%m/%d'),"
            f"  TRY_CAST({dc} AS DATE)"
            f")::DATE"
        )
    else:
        dt_expr = "NULL"

    return f"""
                COALESCE({x_expr},  0.0)        AS x,
                COALESCE({y_expr},  0.0)        AS y,
                COALESCE({z_expr},  0.0)        AS z,
                COALESCE({ti_expr}, 'Untitled') AS title,
                {dt_expr}                       AS date,
                COALESCE({ty_expr}, 'Unknown')  AS type,
                COALESCE({cl_expr}, -1)         AS cluster,
                COALESCE({ur_expr}, '')         AS url,
                {lc_expr}                       AS locations"""


def _rows_to_records(rows) -> list[Record]:
    """Convert DuckDB result rows into Record instances."""
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


# ---------------------------------------------------------------------------
# Network (multi-table) source
# ---------------------------------------------------------------------------

_NET_CACHE: dict[str, tuple[float, dict]] = {}


def load_network(db_path: str, tables: dict) -> dict:
    """
    Load network data (nodes + edges) from a DuckDB file.

    tables is a dict like {"nodes": "entity_nodes", "edges": "entity_edges"}.
    Returns {"nodes": [...], "edges": [...]}.
    Cached by db file mtime.
    """
    key = f"{db_path}::network"
    mtime = os.path.getmtime(db_path)

    if key not in _NET_CACHE or _NET_CACHE[key][0] != mtime:
        _NET_CACHE[key] = (mtime, _scan_network(db_path, tables))

    return _NET_CACHE[key][1]


def _scan_network(db_path: str, tables: dict) -> dict:
    con = duckdb.connect(db_path, read_only=True)
    try:
        nodes_table = _q(tables["nodes"])
        edges_table = _q(tables["edges"])

        node_rows = con.execute(f"SELECT * FROM {nodes_table}").fetchall()
        node_cols = [d[0] for d in con.description]

        edge_rows = con.execute(f"SELECT * FROM {edges_table}").fetchall()
        edge_cols = [d[0] for d in con.description]
    finally:
        con.close()

    nodes = [dict(zip(node_cols, row)) for row in node_rows]
    edges = [dict(zip(edge_cols, row)) for row in edge_rows]

    return {"nodes": nodes, "edges": edges}
