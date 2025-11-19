import json
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Tuple
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Response

from utils.settings import Settings, get_settings

router = APIRouter(prefix="/schedule", tags=["SCHEDULE"])

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
schedule_fake = BASE_DIR / "data" / "shedule.fake.json"
schedule_real = BASE_DIR / "data" / "shedule.real.json"

def _canonical_day_label(label: str) -> str:
    ascii_label = unicodedata.normalize("NFKD", label).encode("ascii", "ignore").decode("ascii")
    cleaned = "".join(ch for ch in ascii_label.lower() if ch.isalpha())
    return cleaned


DAY_NAME_ALIASES = {
    0: ("monday", "mon", "lunes", "dilluns"),
    1: ("tuesday", "tue", "dimarts", "martes"),
    2: ("wednesday", "wed", "dimecres", "miercoles"),
    3: ("thursday", "thu", "dijous", "jueves"),
    4: ("friday", "fri", "divendres", "viernes"),
    5: ("saturday", "sat", "dissabte", "sabado"),
    6: ("sunday", "sun", "diumenge", "domingo"),
}

DAY_LOOKUP: Dict[str, int] = {}
for weekday, names in DAY_NAME_ALIASES.items():
    for name in names:
        DAY_LOOKUP[_canonical_day_label(name)] = weekday


def load_schedule(path: Path) -> Dict[str, List[Dict[str, Any]]]:
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                raise ValueError("Schedule must be an object keyed by day.")
            return data
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"File not found: {path}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"JSON error: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def resolve_day_date(day_label: str, start_date: date) -> date:
    stripped = day_label.strip()
    try:
        parsed = datetime.fromisoformat(stripped)
        return parsed.date()
    except ValueError:
        pass

    normalized = _canonical_day_label(stripped)
    target_weekday = DAY_LOOKUP.get(normalized)
    if target_weekday is None:
        return start_date

    for offset in range(-3, 8):
        candidate = start_date + timedelta(days=offset)
        if candidate.weekday() == target_weekday:
            return candidate
    return start_date


def combine_datetime(day_date: date, time_value: Any, tz: ZoneInfo) -> datetime | None:
    if time_value in (None, "", 0):
        return None
    time_str = str(time_value)
    try:
        hour_str, minute_str = time_str.split(":", 1)
        hour = int(hour_str)
        minute = int(minute_str)
    except ValueError:
        return None
    return datetime(day_date.year, day_date.month, day_date.day, hour, minute, tzinfo=tz)


def normalize_schedule(raw: Dict[str, List[Dict[str, Any]]], settings: Settings) -> Dict[str, List[Dict[str, Any]]]:
    normalized: Dict[str, List[Dict[str, Any]]] = {}
    tz = ZoneInfo(settings.timezone)
    now_dt = datetime.now(tz)
    base_date = settings.hackathon_start.date()

    for day, entries in raw.items():
        day_date = resolve_day_date(day, base_date)
        normalized_entries: List[Dict[str, Any]] = []
        for entry in entries:
            item = dict(entry)
            item["showInMainPage"] = bool(entry.get("showInMainPage", False))
            if "link" in item:
                link_value = item["link"]
                item["link"] = None if link_value in ("", None) else str(link_value)

            start_dt = combine_datetime(day_date, entry.get("start"), tz)
            end_dt = combine_datetime(day_date, entry.get("end"), tz)
            item["startDateTime"] = start_dt.isoformat() if start_dt else None
            item["endDateTime"] = end_dt.isoformat() if end_dt else None

            is_running = False
            if start_dt:
                if end_dt:
                    is_running = start_dt <= now_dt <= end_dt
                else:
                    is_running = start_dt <= now_dt
            item["isRunningNow"] = is_running

            normalized_entries.append(item)
        normalized[day] = normalized_entries
    return normalized


def select_schedule(settings: Settings) -> Tuple[Dict[str, List[Dict[str, Any]]], bool]:
    now_dt = datetime.now(ZoneInfo(settings.timezone))
    use_real = now_dt >= settings.real_data_release
    path = schedule_real if use_real else schedule_fake
    raw_schedule = load_schedule(path)
    return normalize_schedule(raw_schedule, settings), use_real


@router.get("/", summary="Get schedule")
def get_schedule(response: Response, settings: Settings = Depends(get_settings)):
    schedule, using_real = select_schedule(settings)
    response.headers["X-Using-Real-Data"] = "true" if using_real else "false"
    response.headers["X-Release-Datetime"] = settings.real_data_release.isoformat()
    return schedule
