from fastapi.testclient import TestClient

from app.main import app
from app.schemas.models import DemoScenario
from app.services.demo_data import generate_demo_dataset


client = TestClient(app)


def test_demo_generation_is_deterministic():
    first = generate_demo_dataset(DemoScenario.full, "UTC")
    second = generate_demo_dataset(DemoScenario.full, "UTC")
    assert first == second
    assert len(first.records) == 90
    assert len(first.heart_rate_samples) == 90 * 48


def test_demo_scenarios_have_required_shapes():
    short = generate_demo_dataset(DemoScenario.short_baseline)
    missing = generate_demo_dataset(DemoScenario.missing_sensors)
    assert len(short.records) < 14
    assert len(missing.records) == 90
    assert all(record.hrv_rmssd is None for record in missing.records)
    assert all(record.spo2_average is None for record in missing.records)


def test_dashboard_requires_an_active_dataset():
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "no_active_dataset"


def test_full_dashboard_endpoint_returns_coherent_payload():
    activation = client.post(
        "/api/v1/demo/activate", json={"scenario": "full"}
    )
    assert activation.status_code == 200
    assert activation.json()["days"] == 90

    response = client.get(
        "/api/v1/dashboard", params={"period": 30, "date": "2026-09-17"}
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["range"]["selected_date"] == "2026-09-17"
    assert payload["range"]["period_days"] == 30
    assert len(payload["daily"]) == 30
    assert payload["daily"][-1]["date"] == payload["range"]["selected_date"]
    assert payload["summary"] == payload["daily"][-1]["metrics"]
    assert len(payload["selected_day"]["sleep_stages"]) >= 4
    assert payload["selected_day"]["sleep_stages"][0]["start"]
    assert payload["selected_day"]["sleep_stages"][0]["end"]
    assert len(payload["selected_day"]["heart_rate_zones"]) == 5
    assert payload["summary"]["readiness"]["status"] == "available"
    assert payload["summary"]["load"]["value"] is not None
    assert payload["bio_age"]["experimental"] is True

    required_metric_fields = {
        "value",
        "unit",
        "status",
        "reason",
        "source",
        "coverage",
        "baseline",
        "delta",
    }
    for metric in payload["summary"].values():
        assert set(metric) == required_metric_fields


def test_short_demo_has_no_readiness_but_load_remains_available():
    client.post("/api/v1/demo/activate", json={"scenario": "short_baseline"})
    response = client.get("/api/v1/dashboard", params={"period": 30})
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["daily"]) == 10
    assert payload["summary"]["readiness"]["status"] == "unavailable"
    assert payload["summary"]["readiness"]["value"] is None
    assert payload["summary"]["load"]["status"] == "available"
    assert payload["summary"]["load"]["value"] is not None
    assert payload["quality"]["baseline_nights"] == 9


def test_missing_sensors_use_readiness_fallback_and_partial_bio_age():
    client.post("/api/v1/demo/activate", json={"scenario": "missing_sensors"})
    response = client.get("/api/v1/dashboard", params={"period": 7})
    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]["hrv"]["status"] == "unavailable"
    assert payload["summary"]["spo2"]["status"] == "unavailable"
    assert payload["summary"]["readiness"]["status"] == "partial"
    assert payload["summary"]["readiness"]["value"] is not None
    assert payload["summary"]["bio_age"]["status"] == "partial"
    assert set(payload["quality"]["missing_signals"]) >= {
        "hrv_rmssd",
        "spo2_average",
    }


def test_profile_round_trip_and_validation():
    profile = {
        "age": 42,
        "sex": "female",
        "weight_kg": 68,
        "height_cm": 169,
        "sleep_need_hours": 7.75,
        "timezone": "Europe/Moscow",
        "baseline_window_days": 21,
    }
    update = client.put("/api/v1/profile", json=profile)
    assert update.status_code == 200
    assert update.json() == profile
    assert client.get("/api/v1/profile").json() == profile

    invalid = {**profile, "timezone": "Not/A_Real_Zone"}
    assert client.put("/api/v1/profile", json=invalid).status_code == 422


def test_dashboard_rejects_dates_outside_active_data():
    client.post("/api/v1/demo/activate", json={"scenario": "full"})
    response = client.get(
        "/api/v1/dashboard", params={"period": 7, "date": "2020-01-01"}
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_dashboard_range"


def test_real_import_activation_is_explicitly_disabled():
    response = client.post("/api/v1/imports/activate")
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "real_parser_unavailable"
