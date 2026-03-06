"""
Canonical record schema for semantic-toolkit.
Represents a single event/document after ingest normalisation.
"""

from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class Record:
    # 3D embedding coordinates (reduced-dimension vectors)
    x: float
    y: float
    z: float

    # Core metadata
    title: str
    date: date
    type: str
    cluster: int  # -1 for outliers/noise

    # Optional fields
    url: str = ""
    locations: list = field(default_factory=list)  # list of FIPS/ISO location codes

    def to_dict(self) -> dict:
        return {
            "x": self.x,
            "y": self.y,
            "z": self.z,
            "title": self.title,
            "date": self.date.strftime("%m/%d/%Y"),  # preserve original format for JS compat
            "type": self.type,
            "cluster": self.cluster,
            "url": self.url,
            "locations": self.locations,
        }
