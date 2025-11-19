from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends

from utils.settings import Settings, get_settings

router = APIRouter(
    prefix="/timer",
    tags=["TIMER"]
)

def _now(settings: Settings) -> datetime:
    return datetime.now(ZoneInfo(settings.timezone))


@router.get("", summary="Get hacking countdown")
@router.get("/", include_in_schema=False)
def get_timer(settings: Settings = Depends(get_settings)):
    start_dt = settings.hackathon_start
    end_dt = settings.hackathon_end
    now_dt = _now(settings)

    if now_dt < start_dt:
        status = "pending"
        seconds_until_start = int((start_dt - now_dt).total_seconds())
        seconds_remaining = int((end_dt - start_dt).total_seconds())
        seconds_elapsed = 0
    elif start_dt <= now_dt < end_dt:
        status = "running"
        seconds_until_start = 0
        seconds_remaining = int((end_dt - now_dt).total_seconds())
        seconds_elapsed = int((now_dt - start_dt).total_seconds())
    else:
        status = "finished"
        seconds_until_start = 0
        seconds_remaining = 0
        seconds_elapsed = int((end_dt - start_dt).total_seconds())

    return {
        "timezone": settings.timezone,
        "status": status,
        "start_datetime": start_dt.isoformat(),
        "end_datetime": end_dt.isoformat(),
        "now": now_dt.isoformat(),
        "seconds_until_start": seconds_until_start,
        "seconds_elapsed": seconds_elapsed,
        "seconds_remaining": seconds_remaining,
    }
