from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import RoadModel
from backend.app.schemas import RoadSchema
from backend.app.gis.network import haversine_km

router = APIRouter(prefix="/roads", tags=["Roads"])

def _to_schema(r: RoadModel) -> RoadSchema:
    return RoadSchema(
        id=r.id,
        name=r.name,
        startDistrict=r.start_district,
        endDistrict=r.end_district,
        status=r.status,
        riskLevel=r.risk_level,
        rainfallMm=r.rainfall_mm,
        trafficLevel=r.traffic_level,
        roadCondition=r.road_condition,
        landslideProb=r.landslide_prob,
        floodRisk=r.flood_risk,
        overallRisk=r.overall_risk,
        delayMin=r.delay_min,
        lengthKm=r.length_km,
        elevationM=r.elevation_m,
        affectedVehicles=r.affected_vehicles or [],
        affectedDeliveries=r.affected_deliveries or []
    )

@router.get("", response_model=List[RoadSchema])
def list_roads(db: Session = Depends(get_db)):
    roads = db.query(RoadModel).all()
    return [_to_schema(r) for r in roads]

@router.get("/nearby", response_model=List[RoadSchema])
def get_nearby_roads(
    lat: float = Query(..., description="Center latitude"),
    lng: float = Query(..., description="Center longitude"),
    radius: float = Query(100.0, description="Radius in kilometers"),
    db: Session = Depends(get_db)
):
    roads = db.query(RoadModel).all()
    filtered = []
    
    for r in roads:
        start_lat = getattr(r, "start_lat", 26.1445)
        start_lng = getattr(r, "start_lng", 91.7362)
        end_lat = getattr(r, "end_lat", 24.8170)
        end_lng = getattr(r, "end_lng", 93.9368)
        
        # Test distance to start, end, and midpoint
        dist1 = haversine_km(lat, lng, start_lat, start_lng)
        dist2 = haversine_km(lat, lng, end_lat, end_lng)
        dist_mid = haversine_km(lat, lng, (start_lat + end_lat)/2.0, (start_lng + end_lng)/2.0)
        
        if min(dist1, dist2, dist_mid) <= radius:
            filtered.append(_to_schema(r))
            
    return filtered

@router.get("/{id}", response_model=RoadSchema)
def get_road(id: str, db: Session = Depends(get_db)):
    r = db.query(RoadModel).filter(RoadModel.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Road corridor not found")
    return _to_schema(r)
