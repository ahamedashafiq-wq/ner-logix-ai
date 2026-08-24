from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import IncidentModel
from backend.app.schemas import RouteOptimizationRequest, RouteCandidateSchema
from backend.app.gis.network import optimize_multicriteria_routes

router = APIRouter(prefix="/routes", tags=["Routing"])

@router.post("/optimize", response_model=List[RouteCandidateSchema])
def optimize_routes(req: RouteOptimizationRequest, db: Session = Depends(get_db)):
    active_incidents = db.query(IncidentModel).filter(IncidentModel.status != "resolved").all()
    incidents_list = [
        {"affected_roads": inc.affected_roads, "severity": inc.severity}
        for inc in active_incidents
    ]
    return optimize_multicriteria_routes(
        origin=req.origin,
        destination=req.destination,
        blocked_road_name=req.blockedRoadId,
        active_incidents=incidents_list
    )
