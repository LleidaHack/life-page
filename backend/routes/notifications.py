from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any, Deque, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from fastapi import status
from fastapi.websockets import WebSocketDisconnect
from pydantic import BaseModel, Field

from utils.auth import authenticate_admin, issue_admin_token, require_admin
from utils.websocket_manager import WebSocketManager

router = APIRouter(prefix="/notifications", tags=["NOTIFICATIONS"])
manager = WebSocketManager()
alert_history: Deque[dict[str, Any]] = deque(maxlen=50)
ALERT_TTL = timedelta(minutes=2)


def _purge_expired_alerts() -> None:
    """
    Remove alerts older than ALERT_TTL so clients never see stale items.
    """
    now = datetime.now(timezone.utc)
    while alert_history:
        try:
            created = datetime.fromisoformat(alert_history[-1]["created_at"])
        except (KeyError, ValueError):
            alert_history.pop()
            continue
        if created + ALERT_TTL > now:
            break
        alert_history.pop()


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=3)


class NotificationPayload(BaseModel):
    message: str = Field(..., min_length=3)
    title: str | None = Field(default=None, max_length=120)
    level: Literal["info", "warning", "success", "danger"] = "info"


@router.post("/admin/login", summary="Obtain an admin token")
def admin_login(payload: AdminLoginRequest):
    if not authenticate_admin(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return issue_admin_token(payload.username)


@router.post(
    "/alerts",
    summary="Broadcast an alert to all clients",
    dependencies=[Depends(require_admin)],
)
async def send_notification(notification: NotificationPayload):
    now = datetime.now(timezone.utc)
    expires_at = (now + ALERT_TTL).isoformat()
    alert = {
        "id": str(uuid4()),
        "title": notification.title,
        "message": notification.message,
        "level": notification.level,
        "created_at": now.isoformat(),
        "expires_at": expires_at,
    }
    alert_history.appendleft(alert)
    _purge_expired_alerts()
    await manager.broadcast_json({"type": "alert", "payload": alert})
    return {"status": "sent", "alert": alert}


@router.get("/alerts/history", summary="Retrieve the last alerts")
def get_alert_history():
    _purge_expired_alerts()
    return list(alert_history)


@router.get(
    "/stats",
    summary="Get notification channel stats",
)
def get_notification_stats(_: str = Depends(require_admin)):
    _purge_expired_alerts()
    return {
        "connected_clients": manager.connection_count,
        "recent_alerts": len(alert_history),
        "last_alert_at": alert_history[0]["created_at"] if alert_history else None,
    }


@router.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        _purge_expired_alerts()
        if alert_history:
            await websocket.send_json(
                {"type": "alert_history", "payload": list(alert_history)}
            )
        while True:
            await websocket.receive_text()  # Mantén la conexión viva
    except WebSocketDisconnect:
        manager.disconnect(websocket)
