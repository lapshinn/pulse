from __future__ import annotations

import csv
import io
import re
import stat
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath, PureWindowsPath
from typing import Any, Iterable, Sequence

from app.schemas.models import (
    ImportFileInspection,
    ImportFileStatus,
    ImportInspectionError,
    ImportInspectionReport,
    ImportTotals,
)


MAX_TOTAL_BYTES = 100 * 1024 * 1024
MAX_ARCHIVE_MEMBERS = 100
MAX_MEMBER_BYTES = 25 * 1024 * 1024
READ_CHUNK_BYTES = 1024 * 1024
HEADER_SAMPLE_BYTES = 64 * 1024

RECOGNIZED_FILES = {
    "hlth_center_fitness_data.csv": "fitness_raw",
    "hlth_center_sport_record.csv": "workouts",
    "hlth_center_aggregated_fitness_data.csv": "aggregated_fitness",
    "hlth_center_sleep_data.csv": "sleep",
    "hlth_center_hrv_data.csv": "hrv",
}
EXPECTED_CATEGORIES = frozenset(RECOGNIZED_FILES.values())


@dataclass(frozen=True)
class FilePayload:
    name: str
    content: bytes


class ImportPolicyError(ValueError):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        file: str | None = None,
        status_code: int = 400,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.file = file
        self.status_code = status_code

    def as_detail(self) -> dict[str, str | None]:
        return {"code": self.code, "file": self.file, "message": str(self)}


async def read_uploads(files: Iterable[Any]) -> list[FilePayload]:
    payloads: list[FilePayload] = []
    total = 0
    for upload in files:
        filename = (getattr(upload, "filename", None) or "").strip()
        if not filename:
            raise ImportPolicyError("missing_filename", "Every upload needs a filename.")
        chunks: list[bytes] = []
        while True:
            chunk = await upload.read(READ_CHUNK_BYTES)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_TOTAL_BYTES:
                raise ImportPolicyError(
                    "total_size_limit",
                    "Uploads exceed the 100 MB total limit.",
                    status_code=413,
                )
            chunks.append(chunk)
        payloads.append(FilePayload(name=filename, content=b"".join(chunks)))
    return payloads


def _is_safe_archive_name(name: str) -> bool:
    if not name or "\x00" in name:
        return False
    if name.startswith(("/", "\\")):
        return False
    windows_path = PureWindowsPath(name)
    if windows_path.is_absolute() or windows_path.drive:
        return False
    normalized = name.replace("\\", "/")
    posix_path = PurePosixPath(normalized)
    return not posix_path.is_absolute() and ".." not in posix_path.parts


def _is_symlink(info: zipfile.ZipInfo) -> bool:
    unix_mode = info.external_attr >> 16
    return stat.S_ISLNK(unix_mode)


def _decode_header(sample: bytes) -> tuple[str, list[str]]:
    if not sample:
        raise ValueError("CSV is empty.")
    decoded: str | None = None
    encoding_used: str | None = None
    encodings = (
        ("utf-8-sig", "cp1251")
        if sample.startswith(b"\xef\xbb\xbf")
        else ("utf-8", "cp1251")
    )
    for encoding in encodings:
        try:
            decoded = sample.decode(encoding)
            encoding_used = encoding
            break
        except UnicodeDecodeError:
            continue
    if decoded is None or encoding_used is None:
        raise ValueError("CSV header is not UTF-8, UTF-8-SIG, or CP1251.")
    if "\x00" in decoded:
        raise ValueError("CSV header contains NUL bytes.")
    nonempty_lines = [line for line in decoded.splitlines() if line.strip()]
    if not nonempty_lines:
        raise ValueError("CSV has no header row.")
    first_line = nonempty_lines[0]
    try:
        dialect = csv.Sniffer().sniff(first_line, delimiters=",;\t")
        columns = next(csv.reader([first_line], dialect=dialect))
    except csv.Error:
        columns = [first_line]
    cleaned = [column.strip().lstrip("\ufeff") for column in columns]
    if not cleaned or any(not column for column in cleaned):
        raise ValueError("CSV header contains an empty column name.")
    return encoding_used, cleaned


def _classify_csv(name: str, sample: bytes, size: int) -> ImportFileInspection:
    basename = re.split(r"[/\\]", name)[-1].casefold()
    category = RECOGNIZED_FILES.get(basename)
    try:
        encoding, columns = _decode_header(sample)
    except ValueError as exc:
        return ImportFileInspection(
            name=name,
            status=ImportFileStatus.error,
            category=category,
            encoding=None,
            columns=[],
            size_bytes=size,
            error=str(exc),
        )
    return ImportFileInspection(
        name=name,
        status=(
            ImportFileStatus.recognized
            if category is not None
            else ImportFileStatus.unknown
        ),
        category=category,
        encoding=encoding,
        columns=columns,
        size_bytes=size,
        error=None,
    )


def _inspection_report(
    *,
    mode: str,
    files: Sequence[ImportFileInspection],
    uploaded_bytes: int,
    uncompressed_bytes: int,
    member_count: int,
) -> ImportInspectionReport:
    recognized = [
        item for item in files if item.status is ImportFileStatus.recognized
    ]
    unknown = [item for item in files if item.status is ImportFileStatus.unknown]
    failed = [item for item in files if item.status is ImportFileStatus.error]
    present_categories = {
        item.category for item in recognized if item.category is not None
    }
    errors = [
        ImportInspectionError(
            code="invalid_csv_header",
            file=item.name,
            message=item.error or "CSV inspection failed.",
        )
        for item in failed
    ]
    return ImportInspectionReport(
        accepted=not errors,
        mode=mode,
        recognized=recognized,
        missing=sorted(EXPECTED_CATEGORIES - present_categories),
        unknown=unknown,
        errors=errors,
        totals=ImportTotals(
            uploaded_bytes=uploaded_bytes,
            uncompressed_bytes=uncompressed_bytes,
            member_count=member_count,
        ),
    )


def _inspect_zip(payload: FilePayload) -> ImportInspectionReport:
    try:
        archive = zipfile.ZipFile(io.BytesIO(payload.content))
    except (zipfile.BadZipFile, OSError) as exc:
        raise ImportPolicyError(
            "invalid_zip", "The uploaded file is not a valid ZIP archive.", file=payload.name
        ) from exc

    with archive:
        members = archive.infolist()
        if len(members) > MAX_ARCHIVE_MEMBERS:
            raise ImportPolicyError(
                "member_count_limit",
                f"ZIP archives may contain at most {MAX_ARCHIVE_MEMBERS} members.",
                file=payload.name,
                status_code=413,
            )
        uncompressed_total = 0
        seen_names: set[str] = set()
        file_members: list[zipfile.ZipInfo] = []
        for info in members:
            if not _is_safe_archive_name(info.filename):
                raise ImportPolicyError(
                    "unsafe_archive_path",
                    "ZIP member path is absolute or traverses outside the archive.",
                    file=info.filename,
                )
            normalized_name = info.filename.replace("\\", "/").casefold()
            if normalized_name in seen_names:
                raise ImportPolicyError(
                    "duplicate_archive_member",
                    "ZIP contains duplicate member paths.",
                    file=info.filename,
                )
            seen_names.add(normalized_name)
            if _is_symlink(info):
                raise ImportPolicyError(
                    "symlink_not_allowed",
                    "ZIP symbolic links are not allowed.",
                    file=info.filename,
                )
            if info.is_dir():
                continue
            if info.flag_bits & 0x1:
                raise ImportPolicyError(
                    "encrypted_member",
                    "Encrypted ZIP members are not supported.",
                    file=info.filename,
                )
            if not info.filename.casefold().endswith(".csv"):
                raise ImportPolicyError(
                    "non_csv_member",
                    "ZIP archives may contain CSV files only.",
                    file=info.filename,
                )
            if info.file_size > MAX_MEMBER_BYTES:
                raise ImportPolicyError(
                    "member_size_limit",
                    f"Each ZIP member must be at most {MAX_MEMBER_BYTES // (1024 * 1024)} MB.",
                    file=info.filename,
                    status_code=413,
                )
            uncompressed_total += info.file_size
            if uncompressed_total > MAX_TOTAL_BYTES:
                raise ImportPolicyError(
                    "total_size_limit",
                    "ZIP uncompressed content exceeds the 100 MB total limit.",
                    file=payload.name,
                    status_code=413,
                )
            file_members.append(info)

        if not file_members:
            raise ImportPolicyError(
                "empty_archive", "ZIP archive contains no CSV files.", file=payload.name
            )

        inspections: list[ImportFileInspection] = []
        actual_total = 0
        for info in file_members:
            sample = bytearray()
            actual_member_size = 0
            try:
                with archive.open(info, "r") as member:
                    while True:
                        chunk = member.read(READ_CHUNK_BYTES)
                        if not chunk:
                            break
                        actual_member_size += len(chunk)
                        actual_total += len(chunk)
                        if actual_member_size > MAX_MEMBER_BYTES:
                            raise ImportPolicyError(
                                "member_size_limit",
                                "Decompressed ZIP member exceeds the 25 MB limit.",
                                file=info.filename,
                                status_code=413,
                            )
                        if actual_total > MAX_TOTAL_BYTES:
                            raise ImportPolicyError(
                                "total_size_limit",
                                "ZIP uncompressed content exceeds the 100 MB total limit.",
                                file=payload.name,
                                status_code=413,
                            )
                        if len(sample) < HEADER_SAMPLE_BYTES:
                            sample.extend(
                                chunk[: HEADER_SAMPLE_BYTES - len(sample)]
                            )
            except ImportPolicyError:
                raise
            except (OSError, RuntimeError, zipfile.BadZipFile) as exc:
                raise ImportPolicyError(
                    "invalid_zip_member",
                    "A ZIP member could not be safely read.",
                    file=info.filename,
                ) from exc
            inspections.append(
                _classify_csv(info.filename, bytes(sample), actual_member_size)
            )

    return _inspection_report(
        mode="zip",
        files=inspections,
        uploaded_bytes=len(payload.content),
        uncompressed_bytes=actual_total,
        member_count=len(members),
    )


def inspect_payloads(payloads: Sequence[FilePayload]) -> ImportInspectionReport:
    if not payloads:
        raise ImportPolicyError("no_files", "Upload one ZIP or one or more CSV files.")
    uploaded_bytes = sum(len(payload.content) for payload in payloads)
    if uploaded_bytes > MAX_TOTAL_BYTES:
        raise ImportPolicyError(
            "total_size_limit",
            "Uploads exceed the 100 MB total limit.",
            status_code=413,
        )
    zip_payloads = [
        payload for payload in payloads if payload.name.casefold().endswith(".zip")
    ]
    if zip_payloads:
        if len(payloads) != 1:
            raise ImportPolicyError(
                "mixed_upload",
                "Upload exactly one ZIP, or a set containing CSV files only.",
            )
        return _inspect_zip(zip_payloads[0])

    for payload in payloads:
        if not payload.name.casefold().endswith(".csv"):
            raise ImportPolicyError(
                "non_csv_upload",
                "A direct upload set may contain CSV files only.",
                file=payload.name,
            )
        if len(payload.content) > MAX_MEMBER_BYTES:
            raise ImportPolicyError(
                "member_size_limit",
                "Each CSV file must be at most 25 MB.",
                file=payload.name,
                status_code=413,
            )
    inspections = [
        _classify_csv(
            payload.name,
            payload.content[:HEADER_SAMPLE_BYTES],
            len(payload.content),
        )
        for payload in payloads
    ]
    return _inspection_report(
        mode="csv",
        files=inspections,
        uploaded_bytes=uploaded_bytes,
        uncompressed_bytes=uploaded_bytes,
        member_count=len(payloads),
    )
