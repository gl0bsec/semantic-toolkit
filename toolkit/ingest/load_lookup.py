"""
Country/location lookup loader.
Reads a tab-separated file of code → name mappings.

Format (LOOKUP-COUNTRIES.TXT):
    SF\tSouth Africa
    EG\tEgypt
    ...
"""

from pathlib import Path


def load_lookup(lookup_path: Path) -> dict:
    """
    Parse a tab-separated lookup file into {code: name}.
    Skips blank lines and lines without a tab separator.
    """
    lookup = {}
    with open(lookup_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n")
            if "\t" not in line:
                continue
            parts = line.split("\t", 1)
            code = parts[0].strip()
            name = parts[1].strip()
            if code and name:
                lookup[code] = name
    return lookup
