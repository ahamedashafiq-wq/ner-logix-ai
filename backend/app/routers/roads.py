from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import RoadModel
from backend.app.schemas import RoadSchema

router = APIRouter(prefix="/roads", tags=["Roads"])

@router.get("", response_model=List[RoadSchema])
def list_roads(db: Session = Depends(get_db)):
    roads = db.query(RoadModel).all()
    return [
        RoadSchema(
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
        for r in roads
    ]

@router.get("/{id}", response_model=RoadSchema)
def get_road(id: str, db: Session = Depends(get_db)):
    r = db.query(RoadModel).filter(RoadModel.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Road corridor not found")
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
