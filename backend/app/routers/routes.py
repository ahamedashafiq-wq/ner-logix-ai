from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import IncidentModel, RoadModel
from backend.app.schemas import (
    RouteOptimizationRequest,
    RouteCandidateSchema,
    RecommendationRequest,
    RecommendationResponse,
)
from backend.app.gis.network import optimize_multicriteria_routes
from backend.app.services.recommendation_service import generate_cargo_recommendation

router = APIRouter(prefix="/routes", tags=["Routing"])

@router.post("/optimize", response_model=List[RouteCandidateSchema])
def optimize_routes(req: RouteOptimizationRequest, db: Session = Depends(get_db)):
    active_incidents = db.query(IncidentModel).filter(IncidentModel.status != "resolved").all()
    incidents_list = [
        {
            "id": inc.id,
            "affected_roads": inc.affected_roads,
            "severity": inc.severity,
            "type": inc.type,
            "location": inc.location,
            "lat": inc.lat,
            "lng": inc.lng,
        }
        for inc in active_incidents
    ]
    
    return optimize_multicriteria_routes(
        origin=req.origin or "Guwahati",
        destination=req.destination or "Imphal",
        origin_lat=req.origin_lat,
        origin_lng=req.origin_lng,
        destination_lat=req.destination_lat,
        destination_lng=req.destination_lng,
        vehicle_id=req.vehicle_id,
        cargo=req.cargo,
        priority=req.priority,
        blocked_road_name=req.blockedRoadId,
        active_incidents=incidents_list
    )

@router.post("/recommend", response_model=RecommendationResponse)
def get_recommendation(req: RecommendationRequest, db: Session = Depends(get_db)):
    active_incidents = db.query(IncidentModel).filter(IncidentModel.status != "resolved").all()
    incidents_list = [
        {
            "id": inc.id,
            "affected_roads": inc.affected_roads,
            "severity": inc.severity,
            "type": inc.type,
            "location": inc.location,
            "lat": inc.lat,
            "lng": inc.lng,
        }
        for inc in active_incidents
    ]
    
    candidates = optimize_multicriteria_routes(
        origin_lat=req.origin_lat,
        origin_lng=req.origin_lng,
        destination_lat=req.destination_lat,
        destination_lng=req.destination_lng,
        cargo=req.cargo_type,
        priority=req.priority,
        active_incidents=incidents_list
    )
    
    return generate_cargo_recommendation(
        candidates=candidates,
        cargo_type=req.cargo_type,
        priority=req.priority
    )
