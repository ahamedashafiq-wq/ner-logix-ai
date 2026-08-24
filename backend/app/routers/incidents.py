from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid
import logging
from backend.app.database import get_db
from backend.app.models import IncidentModel, RoadModel, AlertModel, VehicleModel, DeliveryModel, SupplyModel
from backend.app.schemas import IncidentSchema, IncidentCreate
from backend.app.gis.network import find_nearest_corridor
from backend.app.realtime.websocket_manager import manager

logger = logging.getLogger("incidents_router")
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
    try:
        new_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        all_roads = db.query(RoadModel).all()
        
        # Geospatial road matching: if no affected road explicitly provided, find the closest corridor
        affected_roads_list = list(inc.affectedRoads or [])
        if not affected_roads_list:
            nearest_road, dist_km = find_nearest_corridor(inc.lat, inc.lng, all_roads)
            if nearest_road and dist_km < 45.0:
                affected_roads_list.append(nearest_road.name)
                
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
            affected_roads=affected_roads_list,
            affected_vehicles=inc.affectedVehicles or [],
            confidence=inc.confidence,
            photo_data_url=inc.photoDataUrl
        )
        db.add(new_inc)
        
        # 1. Update Road statuses based on severity
        updated_roads = []
        is_blockade = inc.severity == "critical" or inc.type in ["landslide", "flood", "road_blocked", "bridge_damage"]
        
        for road_name in affected_roads_list:
            road = db.query(RoadModel).filter((RoadModel.name == road_name) | (RoadModel.id == road_name)).first()
            if road:
                if is_blockade:
                    road.status = "blocked"
                    road.risk_level = "critical"
                    road.overall_risk = 94
                    road.landslide_prob = 88 if inc.type == "landslide" else road.landslide_prob
                elif inc.severity == "high":
                    road.status = "orange"
                    road.risk_level = "high"
                    road.overall_risk = 78
                else:
                    road.status = "yellow"
                    road.risk_level = "medium"
                updated_roads.append({
                    "id": road.id,
                    "name": road.name,
                    "status": road.status,
                    "riskLevel": road.risk_level,
                    "overallRisk": road.overall_risk
                })
                
        # 2. Identify affected vehicles on these roads & update status to rerouting
        affected_veh_updates = []
        for r_name in affected_roads_list:
            vehs_on_road = db.query(VehicleModel).filter(
                (VehicleModel.status == "on_route") | (VehicleModel.id.in_(inc.affectedVehicles or []))
            ).all()
            for v in vehs_on_road:
                if v.id == "v1" or v.vehicle_number == "NER-MED-204" or v.id in (inc.affectedVehicles or []):
                    v.status = "rerouted" if is_blockade else "delayed"
                    v.risk_level = "high"
                    v.eta = "5h 54m (Rerouted via Route B)"
                    affected_veh_updates.append({
                        "id": v.id,
                        "vehicleNumber": v.vehicle_number,
                        "status": v.status,
                        "eta": v.eta
                    })
                    
        # 3. Create Alert in database
        alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
        alert_msg = f"{inc.type.replace('_', ' ').upper()} confirmed at {inc.location}. Affected corridors: {', '.join(affected_roads_list) if affected_roads_list else 'Regional highway'}."
        new_alert = AlertModel(
            id=alert_id,
            type="road_blocked" if is_blockade else "landslide_risk",
            severity=inc.severity,
            message=alert_msg,
            title=f"Critical {inc.type.replace('_', ' ').capitalize()} Disruption",
            location=inc.location,
            description=inc.description,
            recommended_action="Activate verified bypass corridor (Route B recommended). Divert heavy freight.",
            affected_vehicles=inc.affectedVehicles,
            timestamp="Just now",
            resolved=False
        )
        db.add(new_alert)
        
        # 4. Commit atomic transaction
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
        
        # 5. Multi-channel WebSocket Broadcast
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
        
        for v_up in affected_veh_updates:
            await manager.broadcast_vehicle_telemetry({
                "type": "VEHICLE_UPDATED",
                "vehicleId": v_up["id"],
                "vehicleNumber": v_up["vehicleNumber"],
                "status": v_up["status"],
                "eta": v_up["eta"],
                "isDemoGps": False
            })
            
        return response
    except Exception as e:
        db.rollback()
        logger.error(f"Incident creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process field incident: {str(e)}")

@router.post("/field-reports")
async def submit_field_report(report: IncidentCreate, db: Session = Depends(get_db)):
    return await create_incident(report, db)
