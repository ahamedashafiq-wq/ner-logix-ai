from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import (
    VehicleModel,
    DeliveryModel,
    IncidentModel,
    RoadModel,
    DistrictModel,
    AlertModel,
    SupplyModel,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard_kpis(db: Session = Depends(get_db)):
    active_vehicles = db.query(VehicleModel).filter(VehicleModel.status != "offline").count()
    active_deliveries = db.query(DeliveryModel).filter(DeliveryModel.status != "delivered").count()
    critical_incidents = db.query(IncidentModel).filter(
        IncidentModel.severity.in_(["critical", "high"]),
        IncidentModel.status != "resolved"
    ).count()
    blocked_roads = db.query(RoadModel).filter(RoadModel.status == "blocked").count()
    high_risk_corridors = db.query(RoadModel).filter(
        RoadModel.status.in_(["orange", "yellow", "blocked"])
    ).count()
    delayed_deliveries = db.query(DeliveryModel).filter(
        DeliveryModel.status.in_(["delayed", "at_risk"])
    ).count()
    districts_monitored = db.query(DistrictModel).count()
    critical_supplies = db.query(SupplyModel).filter(SupplyModel.risk_level == "critical").count()
    
    return {
        "kpis": [
            {"label": "Districts Monitored", "value": str(districts_monitored), "trend": "All 8 States", "icon": "boxes"},
            {"label": "Active Vehicles", "value": str(active_vehicles), "trend": "+12.4%", "icon": "truck"},
            {"label": "Active Deliveries", "value": str(active_deliveries), "trend": "+8.2%", "icon": "package"},
            {"label": "Critical Incidents", "value": str(critical_incidents), "trend": "+3 active", "icon": "triangle"},
            {"label": "Blocked Roads", "value": str(blocked_roads), "trend": f"+{blocked_roads}", "icon": "route"},
            {"label": "High Risk Corridors", "value": str(high_risk_corridors), "trend": "+2 warning", "icon": "bell"},
            {"label": "Delayed Deliveries", "value": str(delayed_deliveries), "trend": "-18.7%", "icon": "clock"},
            {"label": "Critical Supplies", "value": str(critical_supplies), "trend": "Priority", "icon": "activity"},
        ],
        "logistics_health": {
            "overall_score": 89,
            "road_accessibility": 84,
            "vehicle_availability": 92,
            "delivery_reliability": 88,
            "risk_level": 82,
            "supply_readiness": 94
        }
    }
