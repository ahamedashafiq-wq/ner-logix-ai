"""
Open-Meteo Live Weather Integration for North Eastern Region
Fetches live meteorological observations for all 8 NER state capitals and triggers dynamic risk recalculations.
"""
import asyncio
import logging
import urllib.request
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models import WeatherModel, RoadModel, AlertModel, DistrictModel
from backend.app.ai.risk_model import predict_risk_ml
from backend.app.schemas import RiskPredictionRequest
from backend.app.realtime.websocket_manager import manager

logger = logging.getLogger("weather_service")

# Real coordinates for 8 NER state capitals
NER_WEATHER_STATIONS = [
    {"district": "Guwahati", "state": "Assam", "lat": 26.1445, "lng": 91.7362},
    {"district": "Shillong", "state": "Meghalaya", "lat": 25.5788, "lng": 91.8933},
    {"district": "Imphal", "state": "Manipur", "lat": 24.8170, "lng": 93.9368},
    {"district": "Aizawl", "state": "Mizoram", "lat": 23.7271, "lng": 92.7176},
    {"district": "Kohima", "state": "Nagaland", "lat": 25.6751, "lng": 94.1086},
    {"district": "Gangtok", "state": "Sikkim", "lat": 27.3389, "lng": 88.6065},
    {"district": "Itanagar", "state": "Arunachal Pradesh", "lat": 27.0844, "lng": 93.6053},
    {"district": "Agartala", "state": "Tripura", "lat": 23.8315, "lng": 91.2868},
]

LAST_WEATHER_FETCH_TIME: Optional[datetime] = None
WEATHER_SERVICE_STATUS: str = "INITIALIZING"

def fetch_open_meteo_live_weather(lat: float, lng: float) -> Dict[str, Any]:
    """Fetches live meteorological vector from Open-Meteo API."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}"
        "&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m"
        "&hourly=soil_moisture_0_to_1cm&timezone=auto"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "NER-LOGIX-AI/1.0"})
    with urllib.request.urlopen(req, timeout=8) as response:
        if response.status == 200:
            data = json.loads(response.read().decode())
            current = data.get("current", {})
            hourly = data.get("hourly", {})
            
            soil_moistures = hourly.get("soil_moisture_0_to_1cm", [])
            soil_moist = float(soil_moistures[0] * 100) if soil_moistures else 75.0
            
            weather_code = current.get("weather_code", 0)
            cond_desc = "Clear / Fair"
            if weather_code in [51, 53, 55, 61, 63]:
                cond_desc = "Moderate Rain"
            elif weather_code in [65, 80, 81, 82]:
                cond_desc = "Heavy Monsoon Rain"
            elif weather_code in [95, 96, 99]:
                cond_desc = "Severe Thunderstorm"
            elif weather_code in [1, 2, 3]:
                cond_desc = "Partly Cloudy"
                
            return {
                "temperature_c": float(current.get("temperature_2m", 24.0)),
                "rainfall_mm": float(current.get("rain", current.get("precipitation", 15.0))),
                "humidity": float(current.get("relative_humidity_2m", 80.0)),
                "wind_kph": float(current.get("wind_speed_10m", 12.0)),
                "visibility_km": 8.0 if weather_code < 50 else 3.5,
                "soil_moisture": soil_moist,
                "condition": cond_desc,
                "is_live": True
            }
    raise Exception("Failed to fetch Open-Meteo response")

async def sync_all_ner_weather(db: Session) -> bool:
    """Refreshes all 8 NER state capital observations and executes risk cascades."""
    global LAST_WEATHER_FETCH_TIME, WEATHER_SERVICE_STATUS
    success_count = 0
    
    for station in NER_WEATHER_STATIONS:
        district_name = station["district"]
        lat = station["lat"]
        lng = station["lng"]
        
        try:
            # Fetch in executor to avoid blocking event loop
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, fetch_open_meteo_live_weather, lat, lng)
            
            w_record = db.query(WeatherModel).filter(WeatherModel.district == district_name).first()
            warning = None
            if data["rainfall_mm"] >= 60.0:
                warning = f"High rainfall advisory: {data['rainfall_mm']:.1f}mm observed"
            elif data["rainfall_mm"] >= 30.0:
                warning = f"Moderate monsoon showers: {data['rainfall_mm']:.1f}mm"
                
            if not w_record:
                w_record = WeatherModel(
                    district=district_name,
                    temperature_c=data["temperature_c"],
                    rainfall_mm=data["rainfall_mm"],
                    humidity=data["humidity"],
                    wind_kph=data["wind_kph"],
                    visibility_km=data["visibility_km"],
                    condition=data["condition"],
                    warning=warning,
                    is_demo=False
                )
                db.add(w_record)
            else:
                w_record.temperature_c = data["temperature_c"]
                w_record.rainfall_mm = data["rainfall_mm"]
                w_record.humidity = data["humidity"]
                w_record.wind_kph = data["wind_kph"]
                w_record.visibility_km = data["visibility_km"]
                w_record.condition = data["condition"]
                w_record.warning = warning
                w_record.is_demo = False
                
            # Dynamic AI Risk calculation on connected corridors
            connected_roads = db.query(RoadModel).filter(
                (RoadModel.start_district == district_name) | (RoadModel.end_district == district_name)
            ).all()
            
            for road in connected_roads:
                road.rainfall_mm = data["rainfall_mm"]
                
                # Execute Scikit-Learn ML Model on real meteorological telemetry
                req = RiskPredictionRequest(
                    rainfall=data["rainfall_mm"],
                    rainfall_24h=data["rainfall_mm"] * 1.8,
                    rainfall_72h=data["rainfall_mm"] * 2.6,
                    slope=35.0 if road.name in ["NH-14", "NH-10"] else 20.0,
                    elevation=road.elevation_m or 800.0,
                    soil_moisture=data["soil_moisture"],
                    river_level=2.8 if road.name == "NH-27" else 1.2,
                    historical_landslides=2 if road.name in ["NH-14", "NH-10"] else 0,
                    road_condition=road.road_condition or "Fair",
                    traffic_density=road.traffic_level or "medium",
                    bridge_condition="Fair"
                )
                pred = predict_risk_ml(req)
                road.overall_risk = pred.risk_score
                road.landslide_prob = int(pred.risk_score * 0.85)
                road.risk_level = pred.risk_level.lower()
                
                if road.status != "blocked":
                    if pred.risk_score >= 81:
                        road.status = "orange"
                    elif pred.risk_score >= 50:
                        road.status = "yellow"
                    else:
                        road.status = "accessible"
                        
            success_count += 1
        except Exception as e:
            logger.warning(f"Live weather fetch skipped for {district_name}: {e}")
            
    db.commit()
    
    if success_count > 0:
        LAST_WEATHER_FETCH_TIME = datetime.utcnow()
        WEATHER_SERVICE_STATUS = "LIVE"
        # Broadcast weather update event over WebSockets
        try:
            await manager.broadcast_alert({
                "type": "WEATHER_UPDATED",
                "status": "LIVE",
                "stations_updated": success_count,
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass
        return True
    else:
        WEATHER_SERVICE_STATUS = "DEGRADED"
        return False

async def live_weather_background_poller():
    """Periodic background task that syncs Open-Meteo live weather every 60 seconds."""
    while True:
        try:
            db = SessionLocal()
            await sync_all_ner_weather(db)
            db.close()
        except Exception as e:
            logger.error(f"Error in weather background poller: {e}")
        await asyncio.sleep(60)
