from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid
from backend.app.database import get_db
from backend.app.models import IncidentModel, RoadModel, AlertModel, VehicleModel
from backend.app.schemas import IncidentSchema, IncidentCreate
from backend.app.realtime.websocket_manager import manager

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentSchema])
def list_incidents(db: Session = Depends(get_db)):
    incidents = db.query(IncidentModel).all()
    return [
        IncidentSchema(
            id=inc.id,
            type=inc.type,
            severity=inc.severity,
            status=inc.status,
            location=inc.location,
            lat=inc.lat,
            lng=inc.lng,
            timestamp=inc.timestamp,
            description=inc.description,
            reportedBy=inc.reported_by,
            affectedRoads=inc.affected_roads or [],
            affectedVehicles=inc.affected_vehicles or [],
            confidence=inc.confidence,
            photoDataUrl=inc.photo_data_url
        )
        for inc in incidents
    ]

@router.post("", response_model=IncidentSchema)
async def create_incident(inc: IncidentCreate, db: Session = Depends(get_db)):
    new_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
    new_inc = IncidentModel(
        id=new_id,
        type=inc.type,
        severity=inc.severity,
        status="active",
        location=inc.location,
        lat=inc.lat,
        lng=inc.lng,
        timestamp=datetime.utcnow().strftime("%H:%M UTC"),
        description=inc.description,
        reported_by=inc.reportedBy,
        affected_roads=inc.affectedRoads,
        affected_vehicles=inc.affectedVehicles,
        confidence=inc.confidence,
        photo_data_url=inc.photoDataUrl
    )
    db.add(new_inc)
    
    # 1. Update matching roads
    updated_roads = []
    for road_name in inc.affectedRoads:
        road = db.query(RoadModel).filter((RoadModel.name == road_name) | (RoadModel.id == road_name)).first()
        if road:
            if inc.severity == "critical":
                road.status = "blocked"
                road.risk_level = "critical"
                road.overall_risk = 94
                road.landslide_prob = 88
            elif inc.severity == "high":
                road.status = "orange"
                road.risk_level = "high"
                road.overall_risk = 78
            else:
                road.status = "yellow"
                road.risk_level = "medium"
            updated_roads.append({"id": road.id, "name": road.name, "status": road.status, "riskLevel": road.risk_level})
            
    # 2. Create Alert in database
    alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
    alert_msg = f"{inc.type.upper()} reported at {inc.location}. Affected corridors: {', '.join(inc.affectedRoads) if inc.affectedRoads else 'Regional highway'}."
    new_alert = AlertModel(
        id=alert_id,
        type="road_blocked" if inc.severity == "critical" else "landslide_risk",
        severity=inc.severity,
        message=alert_msg,
        title=f"Critical {inc.type.capitalize()} Disruption",
        location=inc.location,
        description=inc.description,
        recommended_action="Activate Route B bypass corridor. Divert non-emergency transport.",
        affected_vehicles=inc.affectedVehicles,
        timestamp="Just now",
        resolved=False
    )
    db.add(new_alert)
    
    # 3. Update affected vehicles status
    for v_id in (inc.affectedVehicles or []):
        veh = db.query(VehicleModel).filter((VehicleModel.id == v_id) | (VehicleModel.vehicle_number == v_id)).first()
        if veh:
            veh.status = "delayed"
            veh.risk_level = "critical" if inc.severity == "critical" else "high"
            
    db.commit()
    
    response = IncidentSchema(
        id=new_inc.id,
        type=new_inc.type,
        severity=new_inc.severity,
        status=new_inc.status,
        location=new_inc.location,
        lat=new_inc.lat,
        lng=new_inc.lng,
        timestamp=new_inc.timestamp,
        description=new_inc.description,
        reportedBy=new_inc.reported_by,
        affectedRoads=new_inc.affected_roads or [],
        affectedVehicles=new_inc.affected_vehicles or [],
        confidence=new_inc.confidence,
        photoDataUrl=new_inc.photo_data_url
    )
    
    # Broadcast across all relevant WebSockets
    incident_dict = response.dict()
    incident_dict["type"] = "INCIDENT_CREATED"
    await manager.broadcast_incident(incident_dict)
    
    alert_dict = {
        "type": "ALERT_CREATED",
        "id": new_alert.id,
        "severity": new_alert.severity,
        "message": new_alert.message,
        "title": new_alert.title,
        "location": new_alert.location,
        "timestamp": new_alert.timestamp,
        "updatedRoads": updated_roads
    }
    await manager.broadcast_alert(alert_dict)
    
    return response

@router.post("/field-reports")
async def submit_field_report(report: IncidentCreate, db: Session = Depends(get_db)):
    return await create_incident(report, db)
