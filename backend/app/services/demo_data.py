from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Mapping
from zoneinfo import ZoneInfo

from app.schemas.models import DemoScenario


DEMO_END_DATE = date(2026, 9, 17)
SCENARIO_SEEDS: Mapping[DemoScenario, int] = {
    DemoScenario.full: 104_729,
    DemoScenario.short_baseline: 130_363,
    DemoScenario.missing_sensors: 155_921,
}


@dataclass(frozen=True)
class HeartRateSample:
    timestamp_utc: datetime
    bpm: int


@dataclass(frozen=True)
class DailyRecord:
    date: date
    resting_hr: float | None
    hrv_rmssd: float | None
    spo2_average: float | None
    stress_average: float | None
    sleep_minutes: float | None
    time_in_bed_minutes: float | None
    stage_minutes: Mapping[str, float] | None
    bedtime_minute: float | None
    zone_minutes: tuple[float, float, float, float, float] | None
    vo2max: float | None
    steps: int | None
    calories_kcal: float | None


@dataclass(frozen=True)
class DemoDataset:
    scenario: DemoScenario
    seed: int
    records: tuple[DailyRecord, ...]
    heart_rate_samples: tuple[HeartRateSample, ...]

    @property
    def start_date(self) -> date:
        return self.records[0].date

    @property
    def end_date(self) -> date:
        return self.records[-1].date


def _sleep_stages(
    sleep_minutes: float,
    time_in_bed_minutes: float,
    cycle: float,
) -> dict[str, float]:
    deep = sleep_minutes * (0.19 + 0.025 * math.sin(cycle))
    rem = sleep_minutes * (0.24 + 0.025 * math.cos(cycle * 0.7))
    light = max(0.0, sleep_minutes - deep - rem)
    awake = max(0.0, time_in_bed_minutes - sleep_minutes)
    return {
        "deep": round(deep, 1),
        "rem": round(rem, 1),
        "light": round(light, 1),
        "awake": round(awake, 1),
    }


def _zone_minutes(index: int, rng: random.Random) -> tuple[float, float, float, float, float]:
    if index % 7 in (1, 5):
        return tuple(
            round(max(0.0, value), 1)
            for value in (
                19 + rng.uniform(-4, 5),
                31 + rng.uniform(-6, 8),
                18 + rng.uniform(-5, 6),
                8 + rng.uniform(-3, 4),
                2 + rng.uniform(-1.5, 2),
            )
        )  # type: ignore[return-value]
    if index % 7 == 3:
        return tuple(
            round(max(0.0, value), 1)
            for value in (
                12 + rng.uniform(-3, 4),
                18 + rng.uniform(-4, 5),
                7 + rng.uniform(-2, 3),
                1 + rng.uniform(-1, 2),
                0,
            )
        )  # type: ignore[return-value]
    return tuple(
        round(max(0.0, value), 1)
        for value in (
            7 + rng.uniform(-2, 3),
            4 + rng.uniform(-2, 3),
            rng.uniform(0, 2),
            0,
            0,
        )
    )  # type: ignore[return-value]


def _heart_rate_samples(
    record_date: date,
    resting_hr: float,
    zones: tuple[float, float, float, float, float],
    local_timezone: ZoneInfo,
    rng: random.Random,
) -> list[HeartRateSample]:
    samples: list[HeartRateSample] = []
    workout_day = sum(zones[1:]) > 20
    for slot in range(48):
        local_timestamp = datetime.combine(
            record_date, time.min, tzinfo=local_timezone
        ) + timedelta(minutes=slot * 30)
        hour = local_timestamp.hour + local_timestamp.minute / 60.0
        circadian = 9.0 + 8.0 * math.sin((hour - 7.0) / 24.0 * 2.0 * math.pi)
        activity = 0.0
        if workout_day and 17.0 <= hour <= 18.5:
            activity = 58.0 + 18.0 * math.sin((hour - 17.0) / 1.5 * math.pi)
        elif 8.0 <= hour <= 21.0:
            activity = 8.0
        bpm = int(round(resting_hr + circadian + activity + rng.uniform(-3.0, 3.0)))
        samples.append(
            HeartRateSample(
                timestamp_utc=local_timestamp.astimezone(timezone.utc),
                bpm=max(40, min(195, bpm)),
            )
        )
    return samples


def generate_demo_dataset(
    scenario: DemoScenario,
    timezone_name: str = "UTC",
) -> DemoDataset:
    seed = SCENARIO_SEEDS[scenario]
    rng = random.Random(seed)
    number_of_days = 10 if scenario is DemoScenario.short_baseline else 90
    start_date = DEMO_END_DATE - timedelta(days=number_of_days - 1)
    local_timezone = ZoneInfo(timezone_name)
    records: list[DailyRecord] = []
    samples: list[HeartRateSample] = []

    for index in range(number_of_days):
        current_date = start_date + timedelta(days=index)
        weekly = math.sin(index / 7.0 * 2.0 * math.pi)
        slow = math.sin(index / 28.0 * 2.0 * math.pi)
        resting_hr = round(58.0 + 1.7 * slow + rng.uniform(-1.4, 1.4), 1)
        sleep_minutes = round(
            max(330.0, min(540.0, 452.0 + 23.0 * weekly + rng.uniform(-24, 24))),
            1,
        )
        awake_minutes = round(max(18.0, 42.0 + rng.uniform(-11, 16)), 1)
        time_in_bed = round(sleep_minutes + awake_minutes, 1)
        bedtime = (23 * 60 + 18 + 13 * slow + rng.uniform(-13, 13)) % 1440
        zones = _zone_minutes(index, rng)
        hrv = round(51.0 - (resting_hr - 58.0) * 2.2 + rng.uniform(-4, 4), 1)
        spo2 = round(max(92.0, min(99.0, 96.8 + rng.uniform(-1.0, 0.8))), 1)
        stress = round(max(15.0, min(82.0, 39.0 + 7.0 * slow + rng.uniform(-7, 8))), 1)
        steps = int(max(1800, 7_400 + sum(zones) * 31 + rng.uniform(-1500, 1600)))
        calories = round(1780 + steps * 0.043 + sum(zones[2:]) * 2.3, 1)
        vo2max = round(45.5 + 0.7 * slow + rng.uniform(-0.35, 0.35), 1)

        if scenario is DemoScenario.missing_sensors:
            hrv_value: float | None = None
            spo2_value: float | None = None
        else:
            hrv_value = hrv
            spo2_value = spo2

        record = DailyRecord(
            date=current_date,
            resting_hr=resting_hr,
            hrv_rmssd=hrv_value,
            spo2_average=spo2_value,
            stress_average=stress,
            sleep_minutes=sleep_minutes,
            time_in_bed_minutes=time_in_bed,
            stage_minutes=_sleep_stages(sleep_minutes, time_in_bed, index / 5.0),
            bedtime_minute=round(bedtime, 1),
            zone_minutes=zones,
            vo2max=vo2max,
            steps=steps,
            calories_kcal=calories,
        )
        records.append(record)
        samples.extend(
            _heart_rate_samples(current_date, resting_hr, zones, local_timezone, rng)
        )

    return DemoDataset(
        scenario=scenario,
        seed=seed,
        records=tuple(records),
        heart_rate_samples=tuple(samples),
    )
