"""
Dataset configuration loader.
Reads and validates config.json from a dataset directory.
"""

import json
from pathlib import Path

DEFAULTS = {
    "pointSize": {"min": 1, "max": 4, "scale": 0.25},
    "timeline": {"startDate": "2025-01-01"},
    "columns": {
        "x": "map_vector_0",
        "y": "map_vector_1",
        "z": "map_vector_2",
        "title": ["title", "text_name"],
        "date": ["Date", "first_event_date"],
        "url": "SOURCEURL",
        "cluster": "cluster",
        "locations": "event_locations",
        "type": "Type",
    },
    "lookupSource": "LOOKUP-COUNTRIES.TXT",
    "regionFilter": None,
}


def load_config(dataset_dir: Path) -> dict:
    """
    Load and validate config.json from dataset_dir.
    Missing keys are filled from DEFAULTS.
    """
    config_path = dataset_dir / "config.json"
    if not config_path.exists():
        raise FileNotFoundError(f"config.json not found in {dataset_dir}")

    with open(config_path) as f:
        raw = json.load(f)

    config = dict(DEFAULTS)
    config.update(raw)

    # Deep-merge nested dicts
    for key in ("pointSize", "timeline", "columns"):
        if key in DEFAULTS:
            merged = dict(DEFAULTS[key])
            merged.update(raw.get(key, {}))
            config[key] = merged

    ds = config.get("dataSource")
    if ds is None:
        raise ValueError("config.json must specify 'dataSource'")
    if isinstance(ds, dict):
        if "type" not in ds or "path" not in ds:
            raise ValueError("dataSource object must include 'type' and 'path'")
        if ds["type"] != "duckdb":
            raise ValueError(f"unsupported dataSource type: {ds['type']}")
        # Must have either 'table' (single) or 'tables' (dict of named tables)
        if "table" not in ds and "tables" not in ds:
            raise ValueError("dataSource must include 'table' or 'tables'")

    return config
