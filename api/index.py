"""Vercel serverless entrypoint: serves the FastAPI backend at /api/* (and /healthz) on the same origin as the SPA."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402

__all__ = ["app"]
