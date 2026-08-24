from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models import WeatherModel
from backend.app.schemas import WeatherSchema

router = APIRouter(prefix="/weather", tags=["Weather"])

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
