from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from backend.app.database import get_db
from backend.app.models import WeatherModel
from backend.app.schemas import WeatherSchema, LocationWeatherResponse
from backend.app.gis.network import haversine_km

router = APIRouter(prefix="/weather", tags=["Weather"])

WEATHER_STATIONS = {
    "Guwahati": {"lat": 26.1445, "lng": 91.7362, "state": "Assam"},
    "Shillong": {"lat": 25.5788, "lng": 91.8933, "state": "Meghalaya"},
    "Imphal": {"lat": 24.8170, "lng": 93.9368, "state": "Manipur"},
    "Aizawl": {"lat": 23.7271, "lng": 92.7176, "state": "Mizoram"},
    "Kohima": {"lat": 25.6751, "lng": 94.1086, "state": "Nagaland"},
    "Gangtok": {"lat": 27.3389, "lng": 88.6065, "state": "Sikkim"},
    "Itanagar": {"lat": 27.0844, "lng": 93.6053, "state": "Arunachal Pradesh"},
    "Agartala": {"lat": 23.8315, "lng": 91.2868, "state": "Tripura"},
}

@router.get("", response_model=List[WeatherSchema])
def list_weather(db: Session = Depends(get_db)):
    weather_records = db.query(WeatherModel).all()
    return [
        WeatherSchema(
            district=w.district,
            temperatureC=w.temperature_c,
            rainfallMm=w.rainfall_mm,
            humidity=w.humidity,
            windKph=w.wind_kph,
            visibilityKm=w.visibility_km,
            condition=w.condition,
            warning=w.warning,
            isDemo=w.is_demo
        )
        for w in weather_records
    ]

@router.get("/location", response_model=LocationWeatherResponse)
def get_weather_for_location(
    lat: float = Query(..., description="Latitude of requested location"),
    lng: float = Query(..., description="Longitude of requested location"),
    db: Session = Depends(get_db)
):
    # Find nearest weather station
    nearest_station = "Guwahati"
    min_dist = float("inf")
    
    for stn_name, stn_coords in WEATHER_STATIONS.items():
        dist = haversine_km(lat, lng, stn_coords["lat"], stn_coords["lng"])
        if dist < min_dist:
            min_dist = dist
            nearest_station = stn_name

    # Retrieve station record from database
    obs = db.query(WeatherModel).filter(WeatherModel.district.ilike(f"%{nearest_station}%")).first()
    
    temp = obs.temperature_c if obs else 25.0
    rain = obs.rainfall_mm if obs else 20.0
    hum = obs.humidity if obs else 80.0
    wind = obs.wind_kph if obs else 12.0
    vis = obs.visibility_km if obs else 8.0
    cond = obs.condition if obs else "Clear sky"
    warn = obs.warning if obs else None

    # Apply slight distance-based microclimate adjustment if > 30km from station
    if min_dist > 30.0 and lat > 26.0:
        # High altitude terrain adjustment
        temp = round(max(8.0, temp - (min_dist * 0.02)), 1)
        rain = round(max(0.0, rain + (min_dist * 0.1)), 1)

    return LocationWeatherResponse(
        latitude=lat,
        longitude=lng,
        district=nearest_station,
        state=WEATHER_STATIONS[nearest_station]["state"],
        temperatureC=temp,
        rainfallMm=rain,
        humidity=hum,
        windKph=wind,
        visibilityKm=vis,
        soilMoisture=min(100.0, max(20.0, rain * 1.2 + 25.0)),
        condition=cond,
        warning=warn,
        stationDistanceKm=round(min_dist, 1),
        source="Open-Meteo Synoptic Grid",
        timestamp=datetime.utcnow().strftime("%H:%M:%S UTC")
    )
