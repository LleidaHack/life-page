import json
from datetime import datetime
from pathlib import Path
from typing import Any, List, Tuple
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Response

from utils.settings import Settings, get_settings

Router = APIRouter(prefix="/challenges", tags=["CHALLENGES"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
REAL_FILE = DATA_DIR / "challenges.real.json"
FAKE_FILE = DATA_DIR / "challenges.fake.json"


def load_challenges(file_path: Path) -> List[dict[str, Any]]:
    try:
        with open(file_path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"File not found: {file_path}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"JSON error: {exc}") from exc


def _now(tz_name: str) -> datetime:
    return datetime.now(ZoneInfo(tz_name))


def get_dataset(settings: Settings) -> Tuple[List[dict[str, Any]], bool]:
    release_dt = settings.real_data_release
    current_dt = _now(settings.timezone)
    use_real = current_dt >= release_dt
    file_path = REAL_FILE if use_real else FAKE_FILE
    return load_challenges(file_path), use_real


@Router.get("/", summary="Get all challenges")
def get_challenges(response: Response, settings: Settings = Depends(get_settings)):
    challenges, using_real = get_dataset(settings)
    response.headers["X-Using-Real-Data"] = "true" if using_real else "false"
    response.headers["X-Release-Datetime"] = settings.real_data_release.isoformat()
    return challenges


@Router.get("/{challenge_id}", summary="Get challenge by ID")
def get_challenge(challenge_id: int, settings: Settings = Depends(get_settings)):
    challenges, _ = get_dataset(settings)
    for challenge in challenges:
        if challenge.get("id") == challenge_id:
            return challenge
    raise HTTPException(status_code=404, detail=f"Challenge with id {challenge_id} not found.")
