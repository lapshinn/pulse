from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.routes import router


def configure_logging() -> None:
    logger = logging.getLogger("health_dashboard")
    if logger.handlers:
        return
    log_path = Path(__file__).resolve().parents[2] / "logs" / "app.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(
        log_path,
        maxBytes=1_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def create_app() -> FastAPI:
    configure_logging()
    application = FastAPI(
        title="Local Health Dashboard API",
        description=(
            "A local-only health analytics API. Metrics are estimates and are "
            "not intended for diagnosis or treatment."
        ),
        version=__version__,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$",
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "OPTIONS"],
        allow_headers=["Accept", "Content-Type"],
    )
    application.include_router(router)
    return application


app = create_app()
