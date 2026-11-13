import math

import pytest

from app.domain.metrics import (
    age_rhr,
    calculate_bio_age,
    calculate_load,
    calculate_readiness,
    calculate_sleep_score,
    clamp,
    hrv_subscore,
    hrmax_tanaka,
    karvonen_zones,
    spo2_subscore,
    update_sleep_debt,
)


def test_hrv_equal_to_baseline_scores_fifty():
    assert hrv_subscore(52.0, 52.0) == pytest.approx(50.0, abs=1e-9)


def test_spo2_95_scores_one_hundred_and_subscores_clamp():
    assert spo2_subscore(95.0) == 100.0
    assert spo2_subscore(99.0) == 100.0
    assert spo2_subscore(70.0) == 0.0
    assert hrv_subscore(1_000.0, 1.0) == 100.0
    assert hrv_subscore(1.0, 1_000.0) == 0.0


def test_clamp_and_load_stay_within_documented_ranges():
    assert clamp(-1, 0, 100) == 0
    assert clamp(101, 0, 100) == 100
    assert calculate_load((0, 0, 0, 0, 0)).value == 0
    assert calculate_load((10_000, 10_000, 10_000, 10_000, 10_000)).value == 21
    expected = 10 * math.log10(1 + (60 * 1.0) / 60)
    assert calculate_load((0, 60, 0, 0, 0)).value == pytest.approx(expected)


def test_load_is_independent_of_readiness():
    zone_minutes = (20, 30, 10, 5, 1)
    first = calculate_load(zone_minutes)
    second = calculate_load(zone_minutes)
    assert first.value == second.value
    assert "readiness" not in first.components


def test_tanaka_and_karvonen_formulas():
    assert hrmax_tanaka(40) == pytest.approx(180.0)
    zones = karvonen_zones(40, 60)
    assert zones[0] == pytest.approx((120.0, 132.0))
    assert zones[-1] == pytest.approx((168.0, 180.0))


def test_readiness_requires_fourteen_prior_nights():
    result = calculate_readiness(
        hrv_today=50,
        hrv_baseline=50,
        rhr_today=60,
        rhr_baseline=60,
        sleep_minutes=480,
        sleep_need_minutes=480,
        spo2_average=95,
        baseline_nights=13,
    )
    assert result.value is None
    assert result.status == "unavailable"
    assert "1 more" in (result.reason or "")


def test_readiness_reweights_when_hrv_is_missing():
    result = calculate_readiness(
        hrv_today=None,
        hrv_baseline=None,
        rhr_today=60,
        rhr_baseline=60,
        sleep_minutes=480,
        sleep_need_minutes=480,
        spo2_average=95,
        baseline_nights=14,
    )
    # 0.40*80 RHR + 0.40*100 sleep + 0.20*100 SpO2
    assert result.value == pytest.approx(92.0)
    assert result.status == "partial"
    assert result.applied_weights == {
        "hrv": 0.0,
        "rhr": pytest.approx(0.4),
        "sleep": pytest.approx(0.4),
        "spo2": pytest.approx(0.2),
    }


def test_readiness_normalizes_remaining_missing_sensor_weights():
    result = calculate_readiness(
        hrv_today=None,
        hrv_baseline=None,
        rhr_today=60,
        rhr_baseline=60,
        sleep_minutes=480,
        sleep_need_minutes=480,
        spo2_average=None,
        baseline_nights=14,
    )
    assert result.value == pytest.approx(90.0)
    assert result.applied_weights["rhr"] == pytest.approx(0.5)
    assert result.applied_weights["sleep"] == pytest.approx(0.5)


def test_sleep_score_clamps_duration_efficiency_and_composition():
    result = calculate_sleep_score(
        sleep_minutes=600,
        time_in_bed_minutes=400,
        sleep_need_minutes=480,
        stage_minutes={"deep": 600, "rem": 0, "light": 0, "awake": 0},
        bedtime_minutes_7d=(1_420, 10),
    )
    assert result.value is not None
    assert 0 <= result.value <= 100
    assert result.components["duration"] == 100
    assert result.components["efficiency"] == 100
    assert result.components["composition"] is not None
    assert 0 <= result.components["composition"] <= 100
    # 23:40 and 00:10 are 30 minutes apart; population StDev is 15 minutes.
    assert result.components["consistency"] == pytest.approx(70.0)


def test_missing_sleep_night_does_not_accumulate_debt():
    debt = update_sleep_debt(2.5, 8.0, None)
    assert debt == 2.5
    assert update_sleep_debt(debt, 8.0, 420) == pytest.approx(3.5)
    assert update_sleep_debt(1.0, 8.0, 600) == 0.0


def test_age_rhr_uses_half_year_per_bpm_and_clamps():
    assert age_rhr(40, 70, 60) == pytest.approx(45.0)
    assert age_rhr(18, 20, 60) == 18.0
    assert age_rhr(90, 200, 60) == 90.0


def test_bio_age_reweights_available_components_proportionally():
    result = calculate_bio_age(
        chronological_age=40,
        sex="male",
        hrv_rmssd=None,
        resting_hr=60,
        vo2max=None,
        sleep_efficiency=90,
        spo2_average=None,
        stress_average_7d=None,
        active_minutes_7d=None,
    )
    assert result.status == "partial"
    assert result.coverage == pytest.approx(0.30)
    assert sum(result.applied_weights.values()) == pytest.approx(1.0)
    assert result.applied_weights["rhr"] == pytest.approx(2 / 3)
    assert result.applied_weights["sleep_efficiency"] == pytest.approx(1 / 3)
    assert result.value is not None
    assert 18 <= result.value <= 90
