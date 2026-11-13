import pytest

from app.state import state


@pytest.fixture(autouse=True)
def reset_application_state():
    state.reset()
    yield
    state.reset()
