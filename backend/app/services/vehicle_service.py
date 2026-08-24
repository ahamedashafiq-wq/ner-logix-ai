"""
NER-LOGIX AI — Vehicle Telemetry & GPS Management Service
Handles real device GPS ingestion, speed/heading tracking, and live WebSocket broadcasts.
"""
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models import VehicleModel
from backend.app.realtime.websocket_manager import manager

async def ingest_vehicle_gps(
    vehicle_id: str,
    lat: float,
    lng: float,
    speed: float = 35.0,
    heading: float = 0.0,
    status: Optional[str] = "on_route",
    gps_source: str = "LIVE",
    db: Session = None
) -> Dict[str, Any]:
    """Validates and persists vehicle GPS telemetry, and broadcasts over /ws/vehicles."""
    if not (20.0 <= lat <= 32.0 and 85.0 <= lng <= 98.0):
        raise ValueError(f"Coordinates ({lat}, {lng}) outside North Eastern Region bounds.")
        
    v = db.query(VehicleModel).filter(
        (VehicleModel.id == vehicle_id) | (VehicleModel.vehicle_number == vehicle_id)
    ).first()
    
    if not v:
        raise ValueError(f"Vehicle '{vehicle_id}' not found in registry.")
        
    v.current_lat = lat
    v.current_lng = lng
    v.speed = speed
    if status:
        v.status = status
    v.is_demo_gps = (gps_source.upper() == "DEMO")
    
    db.commit()
    
    payload = {
        "type": "VEHICLE_UPDATED",
        "vehicleId": v.id,
        "vehicleNumber": v.vehicle_number,
        "currentLocation": {"lat": v.current_lat, "lng": v.current_lng},
        "speed": v.speed,
        "heading": heading,
        "status": v.status,
        "fuel": v.fuel,
        "battery": v.battery,
        "eta": v.eta,
        "gpsSource": gps_source.upper(),
        "isDemoGps": v.is_demo_gps,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.broadcast_vehicle_telemetry(payload)
    return payload
