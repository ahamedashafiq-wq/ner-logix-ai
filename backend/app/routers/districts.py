from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import DistrictModel, RoadModel, WeatherModel
from backend.app.schemas import DistrictSchema
from backend.app.ai.isolation_predictor import calculate_district_isolation_risk

router = APIRouter(prefix="/districts", tags=["Districts"])

@router.get("", response_model=List[DistrictSchema])
def list_districts(db: Session = Depends(get_db)):
    districts = db.query(DistrictModel).all()
    return [
        DistrictSchema(
            id=d.id,
            name=d.name,
            state=d.state,
            lat=d.lat,
            lng=d.lng,
            accessibilityScore=d.accessibility_score,
            connectivityScore=d.connectivity_score,
            connectivityStatus=d.connectivity_status,
            roadStatus=d.road_status,
            weatherRisk=d.weather_risk,
            activeIncidents=d.active_incidents,
            delayedDeliveries=d.delayed_deliveries,
            supplyStatus=d.supply_status,
            population=d.population,
            isolationRisk=d.isolation_risk,
            estimatedIsolationHours=d.estimated_isolation_hours
        )
        for d in districts
    ]

@router.get("/{id}/accessibility")
def get_district_accessibility(id: str, db: Session = Depends(get_db)):
    district = db.query(DistrictModel).filter(DistrictModel.id == id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    roads = db.query(RoadModel).filter(
        (RoadModel.start_district == district.name) | (RoadModel.end_district == district.name)
    ).all()
    return {
        "district": district.name,
        "state": district.state,
        "accessibility_score": district.accessibility_score,
        "connectivity_status": district.connectivity_status,
        "open_roads": sum(1 for r in roads if r.status != "blocked"),
        "total_connected_roads": len(roads),
        "active_incidents": district.active_incidents,
        "road_status": district.road_status
    }

@router.get("/{id}/supply-risk")
def get_district_supply_risk(id: str, db: Session = Depends(get_db)):
    district = db.query(DistrictModel).filter(DistrictModel.id == id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    return {
        "district": district.name,
        "supply_status": district.supply_status,
        "medicine_days_remaining": 2.4 if district.name == "Aizawl" else 7.0,
        "food_days_remaining": 11.5,
        "fuel_days_remaining": 6.2,
        "critical_incoming_shipments": ["NER-MED-204"] if district.name == "Aizawl" else [],
        "risk_level": "HIGH" if district.supply_status != "adequate" else "LOW"
    }

@router.get("/{id}/isolation")
def get_district_isolation_prediction(id: str, db: Session = Depends(get_db)):
    district = db.query(DistrictModel).filter(DistrictModel.id == id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    roads = db.query(RoadModel).filter(
        (RoadModel.start_district == district.name) | (RoadModel.end_district == district.name)
    ).all()
    roads_list = [{"name": r.name, "status": r.status} for r in roads]
    weather = db.query(WeatherModel).filter(WeatherModel.district == district.name).first()
    weather_dict = {"rainfall_mm": weather.rainfall_mm} if weather else {"rainfall_mm": 35.0}
    
    return calculate_district_isolation_risk(
        district.name,
        roads_list,
        weather_dict,
        {"medicine_days": 2.1 if district.name == "Aizawl" else 5.0}
    )
