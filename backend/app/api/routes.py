from __future__ import annotations

import logging
from datetime import date
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app import __version__
from app.schemas.models import (
    DashboardResponse,
    DemoActivateRequest,
    DemoActivation,
    HealthResponse,
    ImportInspectionReport,
    Profile,
)
from app.services.dashboard import build_dashboard
from app.services.import_inspector import (
    ImportPolicyError,
    inspect_payloads,
    read_uploads,
)
from app.state import state


router = APIRouter(prefix="/api/v1")
logger = logging.getLogger("health_dashboard.api")


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    snapshot = state.snapshot()
    return HealthResponse(
        status="ok",
        version=__version__,
        data_active=snapshot.dataset is not None,
        active_scenario=(
            snapshot.dataset.scenario if snapshot.dataset is not None else None
        ),
    )


@router.post(
    "/demo/activate",
    response_model=DemoActivation,
)
def activate_demo(request: DemoActivateRequest) -> DemoActivation:
    dataset = state.activate_demo(request.scenario)
    logger.info("Activated demo scenario=%s days=%s", request.scenario.value, len(dataset.records))
    return DemoActivation(
        scenario=dataset.scenario,
        days=len(dataset.records),
        start_date=dataset.start_date,
        end_date=dataset.end_date,
        deterministic_seed=dataset.seed,
    )


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(
    period: int = Query(default=30),
    selected_date: date | None = Query(default=None, alias="date"),
) -> DashboardResponse:
    snapshot = state.snapshot()
    if snapshot.dataset is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "no_active_dataset",
                "message": "Activate a demo scenario before requesting the dashboard.",
            },
        )
    effective_date = selected_date or snapshot.dataset.end_date
    try:
        return build_dashboard(
            profile=snapshot.profile,
            dataset=snapshot.dataset,
            period=period,
            selected_date=effective_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_dashboard_range", "message": str(exc)},
        ) from exc


@router.get("/profile", response_model=Profile)
def get_profile() -> Profile:
    return state.profile()


@router.put("/profile", response_model=Profile)
def put_profile(profile: Profile) -> Profile:
    return state.update_profile(profile)


@router.post("/imports/inspect", response_model=ImportInspectionReport)
async def inspect_imports(
    files: list[UploadFile] = File(
        ..., description="Exactly one ZIP or one or more CSV files."
    ),
) -> ImportInspectionReport:
    try:
        payloads = await read_uploads(files)
        report = inspect_payloads(payloads)
        logger.info(
            "Inspected import files=%s recognized=%s unknown=%s errors=%s",
            len(files),
            len(report.recognized),
            len(report.unknown),
            len(report.errors),
        )
        return report
    except ImportPolicyError as exc:
        logger.warning("Rejected import code=%s message=%s", exc.code, str(exc))
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.as_detail(),
        ) from exc
    finally:
        for upload in files:
            await upload.close()


@router.post("/imports/activate")
def activate_import() -> None:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "code": "real_parser_unavailable",
            "message": (
                "Import activation is disabled until a real Mi Fitness export "
                "has been inspected and a recognized parser is implemented."
            ),
        },
    )
