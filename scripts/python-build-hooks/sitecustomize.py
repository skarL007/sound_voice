"""Build-only tempfile workaround for Windows sandbox ACL issues.

This module is injected via PYTHONPATH only during backend packaging.
It replaces tempfile.mkdtemp() with a mkdir-based implementation because
the default tempfile-created directories are not writable in this machine's
Windows sandbox, which breaks ensurepip and pip builds.
"""

from __future__ import annotations

import tempfile
import uuid
from pathlib import Path


def _safe_mkdtemp(suffix: str | None = None, prefix: str | None = None, dir: str | None = None) -> str:
    suffix = suffix or ""
    prefix = prefix or "tmp"
    base = Path(dir or tempfile.gettempdir())

    while True:
        candidate = base / f"{prefix}{uuid.uuid4().hex}{suffix}"
        try:
            candidate.mkdir(parents=True, exist_ok=False)
            return str(candidate)
        except FileExistsError:
            continue


tempfile.mkdtemp = _safe_mkdtemp
