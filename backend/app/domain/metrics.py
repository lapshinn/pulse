from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from typing import Mapping, Sequence


MIN_BASELINE_NIGHTS = 14
LOAD_WEIGHTS = (0.3, 1.0, 2.5, 5.0, 10.0)
ZONE_NAMES = (
    "Recovery",
    "Aerobic base",
    "Aerobic/anaerobic",
    "Anaerobic",
    "Maximum",
)


@dataclass(frozen=True)
class ScoreResult:
    value: float | None
    status: str
    reason: str | None = None
    baseline: float | None = None
    coverage: float = 1.0
    components: Mapping[str, float | None] = field(default_factory=dict)
    applied_weights: Mapping[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class BioAgeResult:
    value: float | None
    status: str
    reason: str | None
    coverage: float
    components: Mapping[str, float | None]
    configured_weights: Mapping[str, float]
    applied_weights: Mapping[str, float]


def clamp(value: float, lower: float, upper: float) -> float:
    if lower > upper:
        raise ValueError("lower clamp bound cannot exceed upper bound")
    return max(lower, min(upper, value))


def hrmax_tanaka(age: int | float) -> float:
    return 208.0 - 0.7 * float(age)


def karvonen_zones(age: int | float, resting_hr: float) -> list[tuple[float, float]]:
    maximum = hrmax_tanaka(age)
    if not 20 <= resting_hr < maximum:
        raise ValueError("resting_hr must be physiologically below HRmax")
    reserve = maximum - resting_hr
    bounds = (0.5, 0.6, 0.7, 0.8, 0.9, 1.0)
    return [
        (resting_hr + reserve * bounds[index], resting_hr + reserve * bounds[index + 1])
        for index in range(5)
    ]


def calculate_load(zone_minutes: Sequence[float] | None) -> ScoreResult:
    if zone_minutes is None:
        return ScoreResult(
            value=None,
            status="unavailable",
            reason="Heart-rate zone minutes are unavailable.",
            coverage=0.0,
        )
    if len(zone_minutes) != 5:
        raise ValueError("zone_minutes must contain exactly five zones")
    clean_minutes = [max(0.0, float(minutes)) for minutes in zone_minutes]
    weighted_minutes = sum(
        weight * minutes for weight, minutes in zip(LOAD_WEIGHTS, clean_minutes)
    )
    # Load deliberately does not use Readiness: this keeps the two signals
    # independently available and avoids a circular dependency.
    value = clamp(10.0 * math.log10(1.0 + weighted_minutes / 60.0), 0.0, 21.0)
    return ScoreResult(
        value=value,
        status="available",
        components={
            f"zone_{index + 1}_minutes": minutes
            for index, minutes in enumerate(clean_minutes)
        },
    )


def hrv_subscore(hrv_today: float, hrv_baseline: float) -> float:
    if hrv_today <= 0 or hrv_baseline <= 0:
        raise ValueError("HRV values must be positive")
    ratio = hrv_today / hrv_baseline
    return clamp(50.0 + 60.0 * math.log2(ratio), 0.0, 100.0)


def rhr_subscore(rhr_today: float, rhr_baseline: float) -> float:
    return clamp(80.0 - (rhr_today - rhr_baseline) * 7.0, 0.0, 100.0)


def duration_subscore(sleep_minutes: float, sleep_need_minutes: float) -> float:
    if sleep_need_minutes <= 0:
        raise ValueError("sleep_need_minutes must be positive")
    return clamp(sleep_minutes / sleep_need_minutes * 100.0, 0.0, 100.0)


def spo2_subscore(spo2_average: float) -> float:
    return clamp(100.0 - max(0.0, 95.0 - spo2_average) * 10.0, 0.0, 100.0)


def calculate_readiness(
    *,
    hrv_today: float | None,
    hrv_baseline: float | None,
    rhr_today: float | None,
    rhr_baseline: float | None,
    sleep_minutes: float | None,
    sleep_need_minutes: float,
    spo2_average: float | None,
    baseline_nights: int,
    minimum_baseline_nights: int = MIN_BASELINE_NIGHTS,
) -> ScoreResult:
    if baseline_nights < minimum_baseline_nights:
        missing = minimum_baseline_nights - baseline_nights
        return ScoreResult(
            value=None,
            status="unavailable",
            reason=f"Need {missing} more prior baseline night(s).",
            coverage=baseline_nights / minimum_baseline_nights,
        )

    components: dict[str, float | None] = {
        "hrv": (
            hrv_subscore(hrv_today, hrv_baseline)
            if hrv_today is not None
            and hrv_baseline is not None
            and hrv_today > 0
            and hrv_baseline > 0
            else None
        ),
        "rhr": (
            rhr_subscore(rhr_today, rhr_baseline)
            if rhr_today is not None and rhr_baseline is not None
            else None
        ),
        "sleep": (
            duration_subscore(sleep_minutes, sleep_need_minutes)
            if sleep_minutes is not None
            else None
        ),
        "spo2": spo2_subscore(spo2_average) if spo2_average is not None else None,
    }

    if components["hrv"] is None:
        configured_weights = {"hrv": 0.0, "rhr": 0.40, "sleep": 0.40, "spo2": 0.20}
    else:
        configured_weights = {"hrv": 0.40, "rhr": 0.25, "sleep": 0.25, "spo2": 0.10}

    available_weight = sum(
        configured_weights[name]
        for name, score in components.items()
        if score is not None
    )
    if available_weight <= 0:
        return ScoreResult(
            value=None,
            status="unavailable",
            reason="No current readiness signals are available.",
            coverage=0.0,
            components=components,
        )

    applied_weights = {
        name: (
            configured_weights[name] / available_weight
            if score is not None and configured_weights[name] > 0
            else 0.0
        )
        for name, score in components.items()
    }
    value = sum(
        float(score) * applied_weights[name]
        for name, score in components.items()
        if score is not None
    )
    expected_signals = 3 if configured_weights["hrv"] == 0 else 4
    available_signals = sum(
        score is not None
        for name, score in components.items()
        if name != "hrv" or configured_weights["hrv"] > 0
    )
    partial = components["hrv"] is None or available_signals < expected_signals
    missing_names = [name.upper() for name, score in components.items() if score is None]
    return ScoreResult(
        value=clamp(value, 0.0, 100.0),
        status="partial" if partial else "available",
        reason=(
            f"Reweighted without {', '.join(missing_names)}."
            if missing_names
            else None
        ),
        baseline=hrv_baseline if components["hrv"] is not None else rhr_baseline,
        coverage=available_signals / expected_signals,
        components=components,
        applied_weights=applied_weights,
    )


def bedtime_consistency_score(bedtime_minutes: Sequence[float | None]) -> float | None:
    available = [float(value) for value in bedtime_minutes if value is not None]
    if len(available) < 2:
        return None
    # Map after-midnight times into the same continuous night as late-evening
    # times before taking the deviation (23:50 and 00:10 are 20m apart).
    unwrapped = [value + 1440.0 if value < 12 * 60 else value for value in available]
    deviation = statistics.pstdev(unwrapped)
    return clamp(100.0 - deviation * 2.0, 0.0, 100.0)


def composition_subscore(stage_minutes: Mapping[str, float]) -> float | None:
    required = ("deep", "rem", "light", "awake")
    if any(name not in stage_minutes for name in required):
        return None
    total = sum(max(0.0, float(stage_minutes[name])) for name in required)
    if total <= 0:
        return None
    ideals = {"deep": 20.0, "rem": 25.0, "light": 50.0, "awake": 5.0}
    difference = sum(
        abs(max(0.0, float(stage_minutes[name])) / total * 100.0 - ideals[name])
        for name in required
    )
    return clamp(100.0 - difference * 0.5, 0.0, 100.0)


def calculate_sleep_score(
    *,
    sleep_minutes: float | None,
    time_in_bed_minutes: float | None,
    sleep_need_minutes: float,
    stage_minutes: Mapping[str, float] | None,
    bedtime_minutes_7d: Sequence[float | None],
) -> ScoreResult:
    if sleep_minutes is None or time_in_bed_minutes is None or time_in_bed_minutes <= 0:
        return ScoreResult(
            value=None,
            status="unavailable",
            reason="Sleep duration or time in bed is unavailable.",
            coverage=0.0,
        )

    components: dict[str, float | None] = {
        "duration": duration_subscore(sleep_minutes, sleep_need_minutes),
        "efficiency": clamp(
            sleep_minutes / time_in_bed_minutes * 100.0, 0.0, 100.0
        ),
        "composition": composition_subscore(stage_minutes) if stage_minutes else None,
        "consistency": bedtime_consistency_score(bedtime_minutes_7d),
    }
    configured_weights = {
        "duration": 0.30,
        "efficiency": 0.25,
        "composition": 0.25,
        "consistency": 0.20,
    }
    available_weight = sum(
        configured_weights[name]
        for name, score in components.items()
        if score is not None
    )
    applied_weights = {
        name: (
            configured_weights[name] / available_weight if score is not None else 0.0
        )
        for name, score in components.items()
    }
    value = sum(
        float(score) * applied_weights[name]
        for name, score in components.items()
        if score is not None
    )
    available_count = sum(score is not None for score in components.values())
    missing = [name for name, score in components.items() if score is None]
    return ScoreResult(
        value=clamp(value, 0.0, 100.0),
        status="available" if available_count == 4 else "partial",
        reason=f"Reweighted without {', '.join(missing)}." if missing else None,
        coverage=available_count / 4.0,
        components=components,
        applied_weights=applied_weights,
    )


def update_sleep_debt(
    previous_debt_hours: float,
    sleep_need_hours: float,
    sleep_minutes: float | None,
) -> float:
    if sleep_minutes is None:
        return max(0.0, previous_debt_hours)
    return max(
        0.0,
        previous_debt_hours + sleep_need_hours - float(sleep_minutes) / 60.0,
    )


def stress_7d(values: Sequence[float | None]) -> ScoreResult:
    window = list(values)[-7:]
    available = [float(value) for value in window if value is not None]
    if not available:
        return ScoreResult(
            value=None,
            status="unavailable",
            reason="No stress observations in the last 7 days.",
            coverage=0.0,
        )
    return ScoreResult(
        value=sum(available) / len(available),
        status="available" if len(available) == len(window) else "partial",
        reason="Some stress days are missing." if len(available) < len(window) else None,
        coverage=len(available) / max(1, len(window)),
    )


def age_rhr(
    chronological_age: float,
    resting_hr: float,
    age_norm_rhr: float = 60.0,
) -> float:
    """Dimensionally valid RHR age: 0.5 year for each bpm from the norm."""
    return clamp(
        chronological_age + (resting_hr - age_norm_rhr) * 0.5,
        18.0,
        90.0,
    )


def _inverse_linear_age(
    value: float,
    value_age_points: Sequence[tuple[float, float]],
) -> float:
    """Interpolate age from descending physiological reference values."""
    ordered = sorted(value_age_points, key=lambda point: point[0], reverse=True)
    if value >= ordered[0][0]:
        return 18.0
    if value <= ordered[-1][0]:
        return 90.0
    for (high_value, young_age), (low_value, old_age) in zip(ordered, ordered[1:]):
        if low_value <= value <= high_value:
            fraction = (high_value - value) / (high_value - low_value)
            return clamp(young_age + fraction * (old_age - young_age), 18.0, 90.0)
    return 90.0


def age_hrv(hrv_rmssd: float) -> float:
    return _inverse_linear_age(
        hrv_rmssd,
        (
            (70.0, 21.5),
            (60.0, 30.5),
            (47.5, 40.5),
            (37.5, 50.5),
            (31.5, 60.5),
            (25.0, 70.0),
        ),
    )


def age_vo2(vo2max: float, sex: str) -> float:
    if sex == "female":
        points = (
            (46.0, 24.5),
            (41.0, 34.5),
            (36.5, 44.5),
            (31.5, 54.5),
            (26.5, 65.0),
        )
    else:
        points = (
            (52.0, 24.5),
            (46.5, 34.5),
            (41.5, 44.5),
            (36.5, 54.5),
            (31.5, 65.0),
        )
    return _inverse_linear_age(vo2max, points)


def age_sleep(sleep_efficiency: float) -> float:
    return clamp(20.0 + max(0.0, 85.0 - sleep_efficiency) * 0.5, 18.0, 90.0)


def age_spo2(chronological_age: float, spo2_average: float) -> float:
    return clamp(
        chronological_age + max(0.0, 95.0 - spo2_average) * 2.0,
        18.0,
        90.0,
    )


def age_stress(chronological_age: float, stress_average: float) -> float:
    if not 20.0 <= stress_average <= 80.0:
        return clamp(chronological_age, 18.0, 90.0)
    return clamp(
        chronological_age + (stress_average - 40.0) / 4.0,
        18.0,
        90.0,
    )


def age_activity(chronological_age: float, active_minutes_7d: float) -> float:
    return clamp(
        chronological_age
        + max(0.0, (150.0 - active_minutes_7d) / 60.0) * 1.8,
        18.0,
        90.0,
    )


def calculate_bio_age(
    *,
    chronological_age: float,
    sex: str,
    hrv_rmssd: float | None,
    resting_hr: float | None,
    vo2max: float | None,
    sleep_efficiency: float | None,
    spo2_average: float | None,
    stress_average_7d: float | None,
    active_minutes_7d: float | None,
    age_norm_rhr: float = 60.0,
) -> BioAgeResult:
    configured_weights = {
        "hrv": 0.35,
        "rhr": 0.20,
        "vo2max": 0.20,
        "sleep_efficiency": 0.10,
        "spo2": 0.05,
        "stress_7d": 0.05,
        "activity": 0.05,
    }
    components: dict[str, float | None] = {
        "hrv": age_hrv(hrv_rmssd) if hrv_rmssd is not None and hrv_rmssd > 0 else None,
        "rhr": (
            age_rhr(chronological_age, resting_hr, age_norm_rhr)
            if resting_hr is not None
            else None
        ),
        "vo2max": age_vo2(vo2max, sex) if vo2max is not None else None,
        "sleep_efficiency": (
            age_sleep(sleep_efficiency) if sleep_efficiency is not None else None
        ),
        "spo2": (
            age_spo2(chronological_age, spo2_average)
            if spo2_average is not None
            else None
        ),
        "stress_7d": (
            age_stress(chronological_age, stress_average_7d)
            if stress_average_7d is not None
            else None
        ),
        "activity": (
            age_activity(chronological_age, active_minutes_7d)
            if active_minutes_7d is not None
            else None
        ),
    }
    available_weight = sum(
        configured_weights[name]
        for name, value in components.items()
        if value is not None
    )
    if available_weight <= 0:
        return BioAgeResult(
            value=None,
            status="unavailable",
            reason="No BioAge components are available.",
            coverage=0.0,
            components=components,
            configured_weights=configured_weights,
            applied_weights={name: 0.0 for name in configured_weights},
        )
    applied_weights = {
        name: (
            configured_weights[name] / available_weight if value is not None else 0.0
        )
        for name, value in components.items()
    }
    result = sum(
        float(value) * applied_weights[name]
        for name, value in components.items()
        if value is not None
    )
    coverage = available_weight / sum(configured_weights.values())
    return BioAgeResult(
        value=clamp(result, 18.0, 90.0),
        status="available" if coverage >= 0.999 else "partial",
        reason="Available component weights were normalized." if coverage < 0.999 else None,
        coverage=coverage,
        components=components,
        configured_weights=configured_weights,
        applied_weights=applied_weights,
    )
