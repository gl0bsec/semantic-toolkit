"""
API request handler for semantic-toolkit.
Provides JSON endpoints backed by toolkit/ingest/.

Routes (all GET):
  /api/data    → list of records as JSON
  /api/config  → dataset config as JSON
  /api/lookup  → {code: name} mapping as JSON

These are handled inline in serve.py by intercepting /api/* paths
before the static file handler takes over.
"""

import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse, parse_qs

# Allow importing ingest from toolkit/
SERVER_DIR = Path(__file__).parent
TOOLKIT_DIR = SERVER_DIR.parent
sys.path.insert(0, str(TOOLKIT_DIR.parent))

from toolkit.ingest import load_config, load_lookup, load_records


def _get_dataset_dir(query: dict, datasets_dir: Path) -> Path | None:
    name = query.get("dataset", [None])[0]
    if not name:
        return None
    d = datasets_dir / name
    return d if d.exists() else None


def _list_datasets(datasets_dir: Path) -> list[dict]:
    """Return metadata for all datasets that have a valid config.json."""
    results = []
    for d in sorted(datasets_dir.iterdir()):
        if not d.is_dir():
            continue
        config_path = d / "config.json"
        if not config_path.exists():
            continue
        try:
            config = load_config(d)
            results.append({
                "name": config.get("name", d.name),
                "views": config.get("views", []),
            })
        except Exception:
            continue
    return results


def handle_api(path: str, datasets_dir: Path) -> tuple[int, str, bytes]:
    """
    Handle an /api/* request.
    Returns (status_code, content_type, body_bytes).
    """
    parsed = urlparse(path)
    route = parsed.path
    query = parse_qs(parsed.query)

    if route == "/api/datasets":
        payload = _list_datasets(datasets_dir)
        return 200, "application/json", json.dumps(payload).encode()

    dataset_dir = _get_dataset_dir(query, datasets_dir)
    if dataset_dir is None:
        return 400, "application/json", json.dumps({"error": "missing or unknown dataset"}).encode()

    try:
        config = load_config(dataset_dir)
    except Exception as e:
        return 500, "application/json", json.dumps({"error": str(e)}).encode()

    if route == "/api/config":
        return 200, "application/json", json.dumps(config).encode()

    if route == "/api/lookup":
        lookup_path = dataset_dir / config.get("lookupSource", "LOOKUP-COUNTRIES.TXT")
        if not lookup_path.exists():
            return 404, "application/json", json.dumps({"error": "lookup file not found"}).encode()
        lookup = load_lookup(lookup_path)
        return 200, "application/json", json.dumps(lookup).encode()

    if route == "/api/data":
        csv_path = dataset_dir / config["dataSource"]
        if not csv_path.exists():
            return 404, "application/json", json.dumps({"error": "data file not found"}).encode()

        start_date_str = config.get("timeline", {}).get("startDate")
        start_date = date.fromisoformat(start_date_str) if start_date_str else None

        records = load_records(csv_path, config["columns"], start_date=start_date)
        payload = [r.to_dict() for r in records]
        return 200, "application/json", json.dumps(payload).encode()

    return 404, "application/json", json.dumps({"error": f"unknown route: {route}"}).encode()
