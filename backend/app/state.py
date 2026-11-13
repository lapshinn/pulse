from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import RLock

from pydantic import ValidationError

from app.schemas.models import DemoScenario, Profile
from app.services.demo_data import DemoDataset, generate_demo_dataset


@dataclass(frozen=True)
class AppSnapshot:
    profile: Profile
    dataset: DemoDataset | None


class InMemoryState:
    """Process-local health data with a small, local profile file."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._profile_path = Path(__file__).resolve().parents[2] / "data" / "profile.json"
        self._profile = self._load_profile()
        self._dataset: DemoDataset | None = None

    def _load_profile(self) -> Profile:
        try:
            return Profile.model_validate_json(self._profile_path.read_text(encoding="utf-8"))
        except (OSError, ValidationError, ValueError):
            return Profile()

    def _save_profile(self, profile: Profile) -> None:
        self._profile_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self._profile_path.with_suffix(".tmp")
        temporary.write_text(profile.model_dump_json(indent=2), encoding="utf-8")
        temporary.replace(self._profile_path)

    def snapshot(self) -> AppSnapshot:
        with self._lock:
            return AppSnapshot(
                profile=self._profile.model_copy(deep=True),
                dataset=self._dataset,
            )

    def profile(self) -> Profile:
        return self.snapshot().profile

    def update_profile(self, profile: Profile) -> Profile:
        with self._lock:
            self._profile = profile.model_copy(deep=True)
            self._save_profile(self._profile)
            return self._profile.model_copy(deep=True)

    def activate_demo(self, scenario: DemoScenario) -> DemoDataset:
        with self._lock:
            dataset = generate_demo_dataset(scenario, self._profile.timezone)
            self._dataset = dataset
            return dataset

    def reset(self) -> None:
        """Restore initial state; intended for app lifecycle and tests."""
        with self._lock:
            self._profile = Profile()
            self._dataset = None


state = InMemoryState()
