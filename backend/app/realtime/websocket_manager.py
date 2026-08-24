"""
Real-time WebSocket Connection Manager
Broadcasts live vehicle telemetry, critical alerts, and incident updates to connected browser clients.
"""
from fastapi import WebSocket
from typing import List, Dict, Any
import json
import logging

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        self.active_vehicle_connections: List[WebSocket] = []
        self.active_alert_connections: List[WebSocket] = []
        self.active_incident_connections: List[WebSocket] = []

    async def connect_vehicles(self, websocket: WebSocket):
        await websocket.accept()
        self.active_vehicle_connections.append(websocket)

    def disconnect_vehicles(self, websocket: WebSocket):
        if websocket in self.active_vehicle_connections:
            self.active_vehicle_connections.remove(websocket)

    async def connect_alerts(self, websocket: WebSocket):
        await websocket.accept()
        self.active_alert_connections.append(websocket)

    def disconnect_alerts(self, websocket: WebSocket):
        if websocket in self.active_alert_connections:
            self.active_alert_connections.remove(websocket)

    async def connect_incidents(self, websocket: WebSocket):
        await websocket.accept()
        self.active_incident_connections.append(websocket)

    def disconnect_incidents(self, websocket: WebSocket):
        if websocket in self.active_incident_connections:
            self.active_incident_connections.remove(websocket)

    async def broadcast_vehicle_telemetry(self, data: Any):
        payload = json.dumps(data) if not isinstance(data, str) else data
        for connection in list(self.active_vehicle_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect_vehicles(connection)

    async def broadcast_alert(self, data: Any):
        payload = json.dumps(data) if not isinstance(data, str) else data
        for connection in list(self.active_alert_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect_alerts(connection)

    async def broadcast_incident(self, data: Any):
        payload = json.dumps(data) if not isinstance(data, str) else data
        for connection in list(self.active_incident_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect_incidents(connection)

manager = ConnectionManager()
