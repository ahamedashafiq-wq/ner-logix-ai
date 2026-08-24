from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from backend.app.database import get_db
from backend.app.models import VehicleModel
from backend.app.schemas import VehicleSchema, GeoPoint
from backend.app.realtime.websocket_manager import manager

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

class GpsLocationUpdate(BaseModel):
    vehicle_id: str = Field(..., description="Unique vehicle ID e.g. v1 or NER-MED-204")
    latitude: float = Field(..., ge=20.0, le=32.0, description="Latitude in NER region")
    longitude: float = Field(..., ge=85.0, le=98.0, description="Longitude in NER region")
    speed: Optional[float] = 35.0
    heading: Optional[float] = 0.0
    status: Optional[str] = "on_route"
    is_live: Optional[bool] = True
    timestamp: Optional[str] = None

@router.get("", response_model=List[VehicleSchema])
def list_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(VehicleModel).all()
    return [
        VehicleSchema(
            id=v.id,
            vehicleNumber=v.vehicle_number,
            type=v.type,
            driverId=v.driver_id,
            driverName=v.driver_name,
            currentLocation=GeoPoint(lat=v.current_lat, lng=v.current_lng),
            speed=v.speed,
            status=v.status,
            cargo=v.cargo,
            cargoPriority=v.cargo_priority,
            capacity=v.capacity,
            currentLoad=v.current_load,
            fuel=v.fuel,
            battery=v.battery,
            currentDeliveryId=v.current_delivery_id,
            origin=v.origin,
            destination=v.destination,
            eta=v.eta,
            deliveryPercentage=v.delivery_percentage,
            riskLevel=v.risk_level,
            isDemoGps=v.is_demo_gps
        )
        for v in vehicles
    ]

@router.get("/{id}", response_model=VehicleSchema)
def get_vehicle(id: str, db: Session = Depends(get_db)):
    v = db.query(VehicleModel).filter((VehicleModel.id == id) | (VehicleModel.vehicle_number == id)).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return VehicleSchema(
        id=v.id,
        vehicleNumber=v.vehicle_number,
        type=v.type,
        driverId=v.driver_id,
        driverName=v.driver_name,
        currentLocation=GeoPoint(lat=v.current_lat, lng=v.current_lng),
        speed=v.speed,
        status=v.status,
        cargo=v.cargo,
        cargoPriority=v.cargo_priority,
        capacity=v.capacity,
        currentLoad=v.current_load,
        fuel=v.fuel,
        battery=v.battery,
        currentDeliveryId=v.current_delivery_id,
        origin=v.origin,
        destination=v.destination,
        eta=v.eta,
        deliveryPercentage=v.delivery_percentage,
        riskLevel=v.risk_level,
        isDemoGps=v.is_demo_gps
    )

@router.post("/location")
async def ingest_live_gps_location(
    req: GpsLocationUpdate,
    db: Session = Depends(get_db)
):
    v = db.query(VehicleModel).filter(
        (VehicleModel.id == req.vehicle_id) | (VehicleModel.vehicle_number == req.vehicle_id)
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail=f"Vehicle '{req.vehicle_id}' not found")
        
    v.current_lat = req.latitude
    v.current_lng = req.longitude
    if req.speed is not None:
        v.speed = req.speed
    if req.status:
        v.status = req.status
    if req.is_live is not None:
        v.is_demo_gps = not req.is_live
        
    db.commit()
    
    payload = {
        "type": "VEHICLE_UPDATED",
        "vehicleId": v.id,
        "vehicleNumber": v.vehicle_number,
        "currentLocation": {"lat": v.current_lat, "lng": v.current_lng},
        "speed": v.speed,
        "heading": req.heading,
        "status": v.status,
        "fuel": v.fuel,
        "battery": v.battery,
        "eta": v.eta,
        "isDemoGps": v.is_demo_gps,
        "timestamp": req.timestamp or datetime.utcnow().isoformat()
    }
    
    # Broadcast to live WebSockets
    await manager.broadcast_vehicle_telemetry(payload)
    return {"status": "SUCCESS", "data": payload}
