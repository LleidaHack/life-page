from typing import Any, List

from fastapi import WebSocket, WebSocketDisconnect

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_json(self, payload: Any):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)
