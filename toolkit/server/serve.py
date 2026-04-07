#!/usr/bin/env python3
"""
Static file server for semantic-toolkit.
Serves toolkit/analysis/ views and datasets/ data files.

Usage:
    python3 serve.py --dataset RU_AFR_EXPERIMENT
    python3 serve.py --dataset RU_AFR_EXPERIMENT --port 8080
"""

import http.server
import socketserver
import os
import sys
import argparse
from pathlib import Path

# Resolve paths relative to this file
SERVER_DIR = Path(__file__).parent
TOOLKIT_DIR = SERVER_DIR.parent
ANALYSIS_DIR = TOOLKIT_DIR / "analysis"
DATASETS_DIR = TOOLKIT_DIR.parent / "datasets"
UI_DIR = TOOLKIT_DIR / "UI"

# Ensure repo root is on the path so toolkit.* imports work
REPO_ROOT = str(TOOLKIT_DIR.parent)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from toolkit.server.api import handle_api  # noqa: E402

DEFAULT_PORT = 8000


DATASET_INDEX_TEMPLATE = (TOOLKIT_DIR / "analysis" / "data-views" / "dataset-index.html")


class Handler(http.server.SimpleHTTPRequestHandler):
    datasets_dir: Path  # set on the class before serving

    def do_GET(self):
        if self.path.startswith("/api/"):
            status, content_type, body = handle_api(self.path, self.__class__.datasets_dir)
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Serve generic dataset index for /{dataset}/index.html if no
        # per-dataset override exists in the analysis directory.
        clean = self.path.split("?", 1)[0]
        parts = clean.strip("/").split("/")
        if (
            len(parts) == 2
            and parts[1] == "index.html"
            and (self.__class__.datasets_dir / parts[0] / "config.json").exists()
            and not (ANALYSIS_DIR / parts[0] / "index.html").exists()
            and DATASET_INDEX_TEMPLATE.exists()
        ):
            body = DATASET_INDEX_TEMPLATE.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        super().do_GET()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write(f"{args[0]} {args[1]}\n")
        sys.stdout.flush()

    def translate_path(self, path):
        """
        Route requests:
          /datasets/...  → DATASETS_DIR/...
          everything else → ANALYSIS_DIR/...
        """
        path = path.split("?", 1)[0]

        if path.startswith("/datasets/"):
            rel = path[len("/datasets/"):]
            return str(DATASETS_DIR / rel)

        if path.startswith("/ui/"):
            rel = path[len("/ui/"):]
            return str(UI_DIR / "dist" / rel)

        if path.startswith("/home/"):
            rel = path[len("/home/"):]
            return str(UI_DIR / "home" / rel)

        rel = path.lstrip("/")
        return str(ANALYSIS_DIR / rel)


def _discover_datasets(datasets_dir: Path) -> list[str]:
    """Return names of all directories under datasets_dir that have a config.json."""
    return sorted(
        d.name for d in datasets_dir.iterdir()
        if d.is_dir() and (d / "config.json").exists()
    )


def main():
    parser = argparse.ArgumentParser(description="semantic-toolkit static server")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    datasets = _discover_datasets(DATASETS_DIR)
    if not datasets:
        print(f"No datasets found in {DATASETS_DIR}", file=sys.stderr)
        sys.exit(1)

    Handler.datasets_dir = DATASETS_DIR

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", args.port), Handler) as httpd:
        print(f"Serving on http://localhost:{args.port}/")
        print(f"Datasets: {', '.join(datasets)}")
        print(f"Analysis: {ANALYSIS_DIR}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down.")
            sys.exit(0)


if __name__ == "__main__":
    main()
