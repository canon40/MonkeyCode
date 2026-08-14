"""Portable settings persistence.

Settings are stored as JSON. When running as a PyInstaller one-file executable
we save next to the executable (fully portable: copy the folder to another PC
and your URLs come along). When running from source we save in the project
directory. If that location is read-only we fall back to the user's home dir.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

SETTINGS_FILENAME = "trafficcheck_settings.json"

DEFAULTS: dict[str, Any] = {
    # All target fields intentionally start blank; each user fills their own.
    "health_urls": [],
    "health_interval": 30,
    "health_timeout": 10,
    "load_url": "",
    "load_method": "GET",
    "load_concurrency": 10,
    "load_mode": "count",       # "count" or "duration"
    "load_total_requests": 200,
    "load_duration_seconds": 10,
    "load_timeout": 10,
}


def _base_dir() -> str:
    if getattr(sys, "frozen", False):  # packaged by PyInstaller
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _candidate_paths() -> list[str]:
    paths = [os.path.join(_base_dir(), SETTINGS_FILENAME)]
    home = os.path.expanduser("~")
    if home and home != "~":
        paths.append(os.path.join(home, "." + SETTINGS_FILENAME))
    return paths


def load() -> dict[str, Any]:
    data = dict(DEFAULTS)
    for path in _candidate_paths():
        try:
            with open(path, "r", encoding="utf-8") as fh:
                stored = json.load(fh)
            if isinstance(stored, dict):
                data.update({k: stored[k] for k in stored if k in DEFAULTS})
                break
        except (OSError, ValueError):
            continue
    return data


def save(data: dict[str, Any]) -> str:
    payload = {k: data.get(k, DEFAULTS[k]) for k in DEFAULTS}
    last_err: Exception | None = None
    for path in _candidate_paths():
        try:
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, ensure_ascii=False, indent=2)
            return path
        except OSError as exc:
            last_err = exc
            continue
    raise OSError(f"could not write settings: {last_err}")
