from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Sex(str, Enum):
    male = "male"
    female = "female"


class DemoScenario(str, Enum):
    full = "full"
    short_baseline = "short_baseline"
    missing_sensors = "missing_sensors"


class MetricStatus(str, Enum):
    available = "available"
    unavailable = "unavailable"
    partial = "partial"


class Profile(StrictModel):
    age: int = Field(default=35, ge=18, le=100)
    sex: Sex = Sex.male
    weight_kg: float = Field(default=75.0, ge=30, le=300)
    height_cm: float = Field(default=175.0, ge=120, le=230)
    sleep_need_hours: float = Field(default=8.0, ge=4, le=12)
    timezone: str = "UTC"
    baseline_window_days: int = Field(default=14, ge=14, le=60)

    @field_validator("timezone")
    @classmethod
    def timezone_must_exist(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("timezone must be a valid IANA timezone") from exc
        return value


class DemoActivateRequest(StrictModel):
    scenario: DemoScenario


class DemoActivation(StrictModel):
    scenario: DemoScenario
    days: int
    start_date: date
    end_date: date
    deterministic_seed: int


class HealthResponse(StrictModel):
    status: str
    version: str
    data_active: bool
    active_scenario: DemoScenario | None


class MetricValue(StrictModel):
    value: float | None
    unit: str
    status: MetricStatus
    reason: str | None
    source: str
    coverage: float = Field(ge=0, le=1)
    baseline: float | None
    delta: float | None


class DashboardRange(StrictModel):
    start_date: date
    end_date: date
    selected_date: date
    period_days: int
    available_start_date: date
    available_end_date: date


class Coach(StrictModel):
    target_load: MetricValue
    recommended_range: str | None
    recommendation: str


class DailyPoint(StrictModel):
    date: date
    metrics: dict[str, MetricValue]
    bedtime: datetime | None
    wake_time: datetime | None
    total_sleep_hours: float | None
    efficiency: float | None


class SleepStage(StrictModel):
    stage: str
    start: datetime
    end: datetime
    minutes: float
    percentage: float


class HeartRateZone(StrictModel):
    zone: int = Field(ge=1, le=5)
    name: str
    lower_bpm: float
    upper_bpm: float
    minutes: float
    load_weight: float


class SelectedDay(StrictModel):
    date: date
    sleep_stages: list[SleepStage]
    heart_rate_zones: list[HeartRateZone]
    sleep_factors: dict[str, float | None]


class BioAgeComponent(StrictModel):
    age_equivalent: float | None
    configured_weight: float
    applied_weight: float
    status: MetricStatus
    reason: str | None


class BioAgePayload(StrictModel):
    metric: MetricValue
    chronological_age: int
    difference_years: float | None
    interpretation: str | None
    components: dict[str, BioAgeComponent]
    experimental: bool = True


class DataQuality(StrictModel):
    overall_coverage: float = Field(ge=0, le=1)
    requested_days: int
    available_days: int
    baseline_nights: int
    scenario: DemoScenario
    missing_signals: list[str]
    warnings: list[str]


class DashboardResponse(StrictModel):
    profile: Profile
    range: DashboardRange
    summary: dict[str, MetricValue]
    coach: Coach
    daily: list[DailyPoint]
    selected_day: SelectedDay
    bio_age: BioAgePayload
    quality: DataQuality
    disclaimers: list[str]


class ImportFileStatus(str, Enum):
    recognized = "recognized"
    unknown = "unknown"
    error = "error"


class ImportFileInspection(StrictModel):
    name: str
    status: ImportFileStatus
    category: str | None
    encoding: str | None
    columns: list[str]
    size_bytes: int
    error: str | None


class ImportInspectionError(StrictModel):
    code: str
    file: str | None
    message: str


class ImportTotals(StrictModel):
    uploaded_bytes: int
    uncompressed_bytes: int
    member_count: int


class ImportInspectionReport(StrictModel):
    accepted: bool
    mode: str
    recognized: list[ImportFileInspection]
    missing: list[str]
    unknown: list[ImportFileInspection]
    errors: list[ImportInspectionError]
    totals: ImportTotals
    parser_available: bool = False
