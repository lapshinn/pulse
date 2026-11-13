import io
import stat
import zipfile

import pytest
from fastapi.testclient import TestClient

import app.services.import_inspector as inspector
from app.main import app
from app.services.import_inspector import FilePayload, ImportPolicyError, inspect_payloads


client = TestClient(app)


def make_zip(entries: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def test_csv_set_reports_recognized_missing_and_unknown_without_guessing():
    recognized = FilePayload(
        "hlth_center_sleep_data.csv",
        "\ufefftimestamp;stage;duration_sec\n".encode("utf-8-sig"),
    )
    unknown = FilePayload(
        "custom_export.csv",
        "неизвестно;значение\n".encode("cp1251"),
    )
    report = inspect_payloads([recognized, unknown])
    assert report.accepted is True
    assert [item.category for item in report.recognized] == ["sleep"]
    assert report.recognized[0].columns == ["timestamp", "stage", "duration_sec"]
    assert report.unknown[0].category is None
    assert report.unknown[0].columns == ["неизвестно", "значение"]
    assert report.unknown[0].encoding == "cp1251"
    assert "sleep" not in report.missing
    assert "hrv" in report.missing


def test_import_inspection_endpoint_accepts_multipart_csv():
    response = client.post(
        "/api/v1/imports/inspect",
        files=[
            (
                "files",
                (
                    "hlth_center_hrv_data.csv",
                    b"date,rmssd_ms\n2026-01-01,52\n",
                    "text/csv",
                ),
            )
        ],
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["accepted"] is True
    assert payload["recognized"][0]["category"] == "hrv"
    assert payload["parser_available"] is False


@pytest.mark.parametrize(
    "unsafe_name",
    (
        "../escape.csv",
        "safe/../../escape.csv",
        "/absolute.csv",
        r"C:\absolute.csv",
    ),
)
def test_zip_slip_and_absolute_paths_are_rejected(unsafe_name):
    payload = FilePayload("export.zip", make_zip({unsafe_name: b"a,b\n1,2\n"}))
    with pytest.raises(ImportPolicyError) as error:
        inspect_payloads([payload])
    assert error.value.code == "unsafe_archive_path"


def test_zip_symlink_is_rejected():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        info = zipfile.ZipInfo("linked.csv")
        info.create_system = 3
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        archive.writestr(info, b"target.csv")
    with pytest.raises(ImportPolicyError) as error:
        inspect_payloads([FilePayload("export.zip", buffer.getvalue())])
    assert error.value.code == "symlink_not_allowed"


def test_zip_non_csv_member_is_rejected():
    payload = FilePayload("export.zip", make_zip({"readme.txt": b"not allowed"}))
    with pytest.raises(ImportPolicyError) as error:
        inspect_payloads([payload])
    assert error.value.code == "non_csv_member"


def test_archive_member_count_limit_is_enforced():
    entries = {f"data_{index}.csv": b"a,b\n" for index in range(101)}
    payload = FilePayload("export.zip", make_zip(entries))
    with pytest.raises(ImportPolicyError) as error:
        inspect_payloads([payload])
    assert error.value.code == "member_count_limit"
    assert error.value.status_code == 413


def test_archive_member_size_limit_is_enforced(monkeypatch):
    monkeypatch.setattr(inspector, "MAX_MEMBER_BYTES", 16)
    payload = FilePayload("export.zip", make_zip({"large.csv": b"a,b\n" + b"x" * 32}))
    with pytest.raises(ImportPolicyError) as error:
        inspect_payloads([payload])
    assert error.value.code == "member_size_limit"
    assert error.value.status_code == 413


def test_total_upload_and_uncompressed_limits_are_enforced(monkeypatch):
    monkeypatch.setattr(inspector, "MAX_TOTAL_BYTES", 20)
    with pytest.raises(ImportPolicyError) as direct_error:
        inspect_payloads([FilePayload("large.csv", b"a,b\n" + b"x" * 30)])
    assert direct_error.value.code == "total_size_limit"

    zipped = FilePayload(
        "export.zip",
        make_zip({"one.csv": b"a\n" + b"x" * 10, "two.csv": b"a\n" + b"y" * 10}),
    )
    with pytest.raises(ImportPolicyError) as zip_error:
        inspect_payloads([zipped])
    assert zip_error.value.code == "total_size_limit"


def test_zip_and_csv_cannot_be_mixed():
    with pytest.raises(ImportPolicyError) as error:
        inspect_payloads(
            [
                FilePayload("export.zip", make_zip({"a.csv": b"a\n"})),
                FilePayload("extra.csv", b"a\n"),
            ]
        )
    assert error.value.code == "mixed_upload"
