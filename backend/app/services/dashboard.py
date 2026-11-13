from __future__ import annotations

import statistics
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Iterable, Sequence
from zoneinfo import ZoneInfo

from app.domain.metrics import (
    LOAD_WEIGHTS,
    ZONE_NAMES,
    BioAgeResult,
    ScoreResult,
    calculate_bio_age,
    calculate_load,
    calculate_readiness,
    calculate_sleep_score,
    karvonen_zones,
    stress_7d,
    update_sleep_debt,
)
from app.schemas.models import (
    BioAgeComponent,
    BioAgePayload,
    Coach,
    DailyPoint,
    DashboardRange,
    DashboardResponse,
    DataQuality,
    HeartRateZone,
    MetricStatus,
    MetricValue,
    Profile,
    SelectedDay,
    SleepStage,
)
from app.services.demo_data import DailyRecord, DemoDataset


DISCLAIMER = (
    "All metrics are approximate estimates based on open algorithms, not medical advice.",
    "The wearable is not a medical device.",
    "BioAge is an experimental functional estimate, not a clinical assessment.",
)


@dataclass(frozen=True)
class DayCalculation:
    record: DailyRecord
    metrics: dict[str, MetricValue]
    sleep_result: ScoreResult
    bio_age_result: BioAgeResult
    baseline_nights: int


def _rounded(value: float | None) -> float | None:
    return round(float(value), 2) if value is not None else None


def _metric_from_score(
    result: ScoreResult,
    *,
    unit: str,
    source: str,
    delta: float | None = None,
) -> MetricValue:
    return MetricValue(
        value=_rounded(result.value),
        unit=unit,
        status=MetricStatus(result.status),
        reason=result.reason,
        source=source,
        coverage=min(1.0, max(0.0, result.coverage)),
        baseline=_rounded(result.baseline),
        delta=_rounded(delta),
    )


def _raw_metric(
    value: float | None,
    *,
    unit: str,
    source: str,
    unavailable_reason: str,
    baseline: float | None = None,
) -> MetricValue:
    return MetricValue(
        value=_rounded(value),
        unit=unit,
        status=MetricStatus.available if value is not None else MetricStatus.unavailable,
        reason=None if value is not None else unavailable_reason,
        source=source,
        coverage=1.0 if value is not None else 0.0,
        baseline=_rounded(baseline),
        delta=(
            _rounded(value - baseline)
            if value is not None and baseline is not None
            else None
        ),
    )


def _median(values: Iterable[float | None], minimum_count: int = 1) -> float | None:
    available = [float(value) for value in values if value is not None]
    return statistics.median(available) if len(available) >= minimum_count else None


def _bio_metric(result: BioAgeResult, chronological_age: int) -> MetricValue:
    return MetricValue(
        value=_rounded(result.value),
        unit="years",
        status=MetricStatus(result.status),
        reason=result.reason,
        source="experimental weighted physiological age components",
        coverage=result.coverage,
        baseline=float(chronological_age),
        delta=(
            _rounded(result.value - chronological_age)
            if result.value is not None
            else None
        ),
    )


def _calculate_days(profile: Profile, records: Sequence[DailyRecord]) -> list[DayCalculation]:
    sleep_need_minutes = profile.sleep_need_hours * 60.0
    sleep_debt_hours = 0.0
    calculated: list[DayCalculation] = []

    for index, record in enumerate(records):
        prior_start = max(0, index - profile.baseline_window_days)
        prior = records[prior_start:index]
        baseline_nights = sum(
            item.sleep_minutes is not None and item.resting_hr is not None
            for item in prior
        )
        rhr_baseline = _median(
            (item.resting_hr for item in prior), minimum_count=14
        )
        hrv_baseline = _median(
            (item.hrv_rmssd for item in prior), minimum_count=14
        )

        load_result = calculate_load(record.zone_minutes)
        readiness_result = calculate_readiness(
            hrv_today=record.hrv_rmssd,
            hrv_baseline=hrv_baseline,
            rhr_today=record.resting_hr,
            rhr_baseline=rhr_baseline,
            sleep_minutes=record.sleep_minutes,
            sleep_need_minutes=sleep_need_minutes,
            spo2_average=record.spo2_average,
            baseline_nights=baseline_nights,
        )
        bedtime_window = [
            item.bedtime_minute for item in records[max(0, index - 6) : index + 1]
        ]
        sleep_result = calculate_sleep_score(
            sleep_minutes=record.sleep_minutes,
            time_in_bed_minutes=record.time_in_bed_minutes,
            sleep_need_minutes=sleep_need_minutes,
            stage_minutes=record.stage_minutes,
            bedtime_minutes_7d=bedtime_window,
        )
        previous_debt = sleep_debt_hours
        sleep_debt_hours = update_sleep_debt(
            sleep_debt_hours, profile.sleep_need_hours, record.sleep_minutes
        )
        debt_status = (
            "available" if record.sleep_minutes is not None else "partial"
        )
        debt_reason = (
            None
            if record.sleep_minutes is not None
            else "Missing night skipped; prior debt was carried forward."
        )
        debt_result = ScoreResult(
            value=sleep_debt_hours,
            status=debt_status,
            reason=debt_reason,
            coverage=1.0 if record.sleep_minutes is not None else 0.0,
        )
        stress_result = stress_7d(
            [item.stress_average for item in records[max(0, index - 6) : index + 1]]
        )
        recent_activity = sum(
            sum(item.zone_minutes[2:])
            for item in records[max(0, index - 6) : index + 1]
            if item.zone_minutes is not None
        )
        sleep_efficiency = (
            record.sleep_minutes / record.time_in_bed_minutes * 100.0
            if record.sleep_minutes is not None
            and record.time_in_bed_minutes is not None
            and record.time_in_bed_minutes > 0
            else None
        )
        bio_result = calculate_bio_age(
            chronological_age=profile.age,
            sex=profile.sex.value,
            hrv_rmssd=record.hrv_rmssd,
            resting_hr=record.resting_hr,
            vo2max=record.vo2max,
            sleep_efficiency=sleep_efficiency,
            spo2_average=record.spo2_average,
            stress_average_7d=stress_result.value,
            active_minutes_7d=recent_activity,
        )

        metrics = {
            "load": _metric_from_score(
                load_result,
                unit="0-21",
                source="weighted Karvonen-zone minutes",
            ),
            "readiness": _metric_from_score(
                readiness_result,
                unit="%",
                source="14-day prior HRV/RHR baseline, sleep, and SpO2",
            ),
            "sleep_score": _metric_from_score(
                sleep_result,
                unit="%",
                source="sleep duration, efficiency, composition, and consistency",
            ),
            "sleep_debt": _metric_from_score(
                debt_result,
                unit="hours",
                source="cumulative available-night sleep deficit",
                delta=sleep_debt_hours - previous_debt,
            ),
            "stress_7d": _metric_from_score(
                stress_result,
                unit="0-100",
                source="7-day mean wearable stress",
            ),
            "hrv": _raw_metric(
                record.hrv_rmssd,
                unit="ms",
                source="nightly RMSSD",
                unavailable_reason="HRV sensor data is unavailable.",
                baseline=hrv_baseline,
            ),
            "resting_hr": _raw_metric(
                record.resting_hr,
                unit="bpm",
                source="nightly resting heart rate",
                unavailable_reason="Nightly resting heart rate is unavailable.",
                baseline=rhr_baseline,
            ),
            "spo2": _raw_metric(
                record.spo2_average,
                unit="%",
                source="nightly mean SpO2",
                unavailable_reason="SpO2 sensor data is unavailable.",
            ),
            "vo2max": _raw_metric(
                record.vo2max,
                unit="ml/kg/min",
                source="wearable VO2max estimate",
                unavailable_reason="VO2max data is unavailable.",
            ),
            "bio_age": _bio_metric(bio_result, profile.age),
        }
        calculated.append(
            DayCalculation(
                record=record,
                metrics=metrics,
                sleep_result=sleep_result,
                bio_age_result=bio_result,
                baseline_nights=baseline_nights,
            )
        )
    return calculated


def _sleep_times(
    profile: Profile,
    record: DailyRecord,
) -> tuple[datetime | None, datetime | None]:
    if record.bedtime_minute is None or record.time_in_bed_minutes is None:
        return None, None
    local_midnight = datetime.combine(
        record.date,
        time.min,
        tzinfo=ZoneInfo(profile.timezone),
    )
    bedtime = local_midnight + timedelta(minutes=record.bedtime_minute)
    return bedtime, bedtime + timedelta(minutes=record.time_in_bed_minutes)


def _sleep_segments(
    profile: Profile,
    record: DailyRecord,
) -> list[SleepStage]:
    bedtime, _ = _sleep_times(profile, record)
    if bedtime is None or not record.stage_minutes:
        return []

    sequence = (
        "awake",
        "light",
        "deep",
        "light",
        "rem",
        "light",
        "deep",
        "light",
        "rem",
        "awake",
        "light",
        "deep",
        "light",
        "rem",
        "awake",
    )
    counts = Counter(sequence)
    used: dict[str, float] = {name: 0.0 for name in counts}
    seen: dict[str, int] = {name: 0 for name in counts}
    total = sum(max(0.0, float(value)) for value in record.stage_minutes.values())
    cursor = bedtime
    stages: list[SleepStage] = []

    for name in sequence:
        stage_total = max(0.0, float(record.stage_minutes.get(name, 0.0)))
        seen[name] += 1
        if seen[name] == counts[name]:
            duration = max(0.0, stage_total - used[name])
        else:
            duration = stage_total / counts[name]
            used[name] += duration
        if duration <= 0:
            continue
        end = cursor + timedelta(minutes=duration)
        stages.append(
            SleepStage(
                stage=name,
                start=cursor,
                end=end,
                minutes=round(duration, 1),
                percentage=round(duration / total * 100.0, 2) if total else 0.0,
            )
        )
        cursor = end
    return stages


def _selected_day(profile: Profile, calculation: DayCalculation) -> SelectedDay:
    record = calculation.record
    stages = _sleep_segments(profile, record)

    zones: list[HeartRateZone] = []
    if record.zone_minutes is not None and record.resting_hr is not None:
        bounds = karvonen_zones(profile.age, record.resting_hr)
        zones = [
            HeartRateZone(
                zone=index + 1,
                name=ZONE_NAMES[index],
                lower_bpm=round(bounds[index][0], 1),
                upper_bpm=round(bounds[index][1], 1),
                minutes=round(record.zone_minutes[index], 1),
                load_weight=LOAD_WEIGHTS[index],
            )
            for index in range(5)
        ]
    return SelectedDay(
        date=record.date,
        sleep_stages=stages,
        heart_rate_zones=zones,
        sleep_factors={
            "duration": _rounded(calculation.sleep_result.components.get("duration")),
            "efficiency": _rounded(calculation.sleep_result.components.get("efficiency")),
            "composition": _rounded(calculation.sleep_result.components.get("composition")),
            "consistency": _rounded(calculation.sleep_result.components.get("consistency")),
        },
    )


def _bio_payload(profile: Profile, calculation: DayCalculation) -> BioAgePayload:
    result = calculation.bio_age_result
    components = {
        name: BioAgeComponent(
            age_equivalent=_rounded(age_value),
            configured_weight=result.configured_weights[name],
            applied_weight=result.applied_weights[name],
            status=(
                MetricStatus.available
                if age_value is not None
                else MetricStatus.unavailable
            ),
            reason=None if age_value is not None else f"{name} data is unavailable.",
        )
        for name, age_value in result.components.items()
    }
    difference = (
        result.value - profile.age if result.value is not None else None
    )
    interpretation: str | None
    if difference is None:
        interpretation = None
    elif difference < 0:
        interpretation = "younger"
    elif difference <= 3:
        interpretation = "aligned"
    else:
        interpretation = "older"
    return BioAgePayload(
        metric=calculation.metrics["bio_age"],
        chronological_age=profile.age,
        difference_years=_rounded(difference),
        interpretation=interpretation,
        components=components,
    )


def _coach(readiness: MetricValue) -> Coach:
    if readiness.value is None:
        target = MetricValue(
            value=None,
            unit="0-21",
            status=MetricStatus.unavailable,
            reason="Readiness is unavailable, so a target cannot be derived.",
            source="readiness × 0.21",
            coverage=readiness.coverage,
            baseline=None,
            delta=None,
        )
        return Coach(
            target_load=target,
            recommended_range=None,
            recommendation="Use perceived exertion and keep activity easy.",
        )
    target_value = max(0.0, min(21.0, readiness.value * 0.21))
    if readiness.value >= 67:
        recommended_range = "14-17"
        recommendation = "Good recovery signals; a productive training day is reasonable."
    elif readiness.value >= 34:
        recommended_range = "10-13"
        recommendation = "Moderate recovery signals; keep the session controlled."
    else:
        recommended_range = "0-9"
        recommendation = "Low recovery signals; favor rest or light movement."
    target = MetricValue(
        value=round(target_value, 2),
        unit="0-21",
        status=readiness.status,
        reason=readiness.reason,
        source="readiness × 0.21",
        coverage=readiness.coverage,
        baseline=None,
        delta=None,
    )
    return Coach(
        target_load=target,
        recommended_range=recommended_range,
        recommendation=recommendation,
    )


def _quality(
    dataset: DemoDataset,
    calculations: Sequence[DayCalculation],
    requested_days: int,
    selected: DayCalculation,
) -> DataQuality:
    raw_fields = (
        "resting_hr",
        "hrv_rmssd",
        "spo2_average",
        "stress_average",
        "sleep_minutes",
        "zone_minutes",
        "vo2max",
        "steps",
    )
    total_slots = len(calculations) * len(raw_fields)
    available_slots = sum(
        getattr(item.record, field_name) is not None
        for item in calculations
        for field_name in raw_fields
    )
    missing_signals = [
        field_name
        for field_name in raw_fields
        if not any(getattr(item.record, field_name) is not None for item in calculations)
    ]
    warnings: list[str] = []
    if selected.baseline_nights < 14:
        warnings.append(
            f"Readiness needs {14 - selected.baseline_nights} more prior baseline night(s)."
        )
    if "hrv_rmssd" in missing_signals:
        warnings.append("Readiness weights are rebalanced because HRV is absent.")
    if "spo2_average" in missing_signals:
        warnings.append("SpO2-dependent components are unavailable.")
    return DataQuality(
        overall_coverage=round(
            available_slots / total_slots if total_slots else 0.0, 4
        ),
        requested_days=requested_days,
        available_days=len(calculations),
        baseline_nights=selected.baseline_nights,
        scenario=dataset.scenario,
        missing_signals=missing_signals,
        warnings=warnings,
    )


def build_dashboard(
    *,
    profile: Profile,
    dataset: DemoDataset,
    period: int,
    selected_date: date,
) -> DashboardResponse:
    if period not in (7, 30, 90):
        raise ValueError("period must be one of 7, 30, or 90")
    if not dataset.start_date <= selected_date <= dataset.end_date:
        raise ValueError(
            f"date must be between {dataset.start_date.isoformat()} and "
            f"{dataset.end_date.isoformat()}"
        )

    all_calculations = _calculate_days(profile, dataset.records)
    selected = next(
        item for item in all_calculations if item.record.date == selected_date
    )
    requested_start = selected_date - timedelta(days=period - 1)
    visible = [
        item
        for item in all_calculations
        if requested_start <= item.record.date <= selected_date
    ]
    daily: list[DailyPoint] = []
    for item in visible:
        bedtime, wake_time = _sleep_times(profile, item.record)
        efficiency = (
            item.record.sleep_minutes / item.record.time_in_bed_minutes * 100.0
            if item.record.sleep_minutes is not None
            and item.record.time_in_bed_minutes is not None
            and item.record.time_in_bed_minutes > 0
            else None
        )
        daily.append(
            DailyPoint(
                date=item.record.date,
                metrics=item.metrics,
                bedtime=bedtime,
                wake_time=wake_time,
                total_sleep_hours=_rounded(
                    item.record.sleep_minutes / 60.0
                    if item.record.sleep_minutes is not None
                    else None
                ),
                efficiency=_rounded(efficiency),
            )
        )
    response_range = DashboardRange(
        start_date=visible[0].record.date,
        end_date=visible[-1].record.date,
        selected_date=selected_date,
        period_days=period,
        available_start_date=dataset.start_date,
        available_end_date=dataset.end_date,
    )
    return DashboardResponse(
        profile=profile,
        range=response_range,
        summary=selected.metrics,
        coach=_coach(selected.metrics["readiness"]),
        daily=daily,
        selected_day=_selected_day(profile, selected),
        bio_age=_bio_payload(profile, selected),
        quality=_quality(dataset, visible, period, selected),
        disclaimers=list(DISCLAIMER),
    )
