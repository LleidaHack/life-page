import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(
    prefix="/activities",
    tags=["ACTIVITIES"]
)


activities_file = Path(__file__).resolve().parent.parent / "data" / "activities.json"


def load_activities():
    try:
        with open(activities_file, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"File not found: {activities_file}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON error: {str(e)}")
    
@router.get("/", summary="Get all activities")
def get_activities():
    return load_activities()

@router.get("/{id}", summary="Get activity by ID")
def get_activity(id: int):
    activities = load_activities()
    for activity in activities:
        if activity.get("id") == id:
            return activity
    raise HTTPException(status_code=404, detail=f"Activity with id {id} not found.")
