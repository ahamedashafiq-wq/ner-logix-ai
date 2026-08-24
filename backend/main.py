"""
NER-LOGIX AI — FastAPI Backend Server
Provides high-performance REST APIs and AI Risk Assessment for North Eastern India Logistics.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn

from backend.schemas import (
    VehicleSchema,
    IncidentSchema,
    IncidentCreate,
    RoadSchema,
    WeatherSchema,
    RiskPredictionRequest,
    RiskPredictionResponse,
    RouteOptimizationRequest,
    RouteCandidateSchema,
    DeliverySchema,
    DistrictSchema,
    AlertSchema,
    SupplySchema,
    WarehouseSchema,
)
from backend.ai.risk_model import predict_ai_risk
from backend.ai.route_optimizer import calculate_alternate_routes

app = FastAPI(
    title="NER-LOGIX AI Backend",
    description="AI-powered logistics accessibility intelligence platform for India's North Eastern Region (NER)",
    version="1.0.0",
)

# CORS middleware for Next.js frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory mock database store (matches mock/data.ts)
VEHICLES_DB = [
    {
        "id": "v1",
        "vehicleNumber": "NER-MED-204",
        "type": "van",
        "driverId": "dr1",
        "driverName": "Raj Kumar Barman",
        "currentLocation": {"lat": 25.45, "lng": 92.45},
        "speed": 43,
        "status": "on_route",
        "cargo": "Emergency Medicines & Blood Plasma",
        "cargoPriority": "critical",
        "capacity": 1200,
        "currentLoad": 680,
        "fuel": 72.0,
        "battery": 92.0,
        "currentDeliveryId": "del1",
        "origin": "Guwahati",
        "destination": "Aizawl",
        "eta": "5h 12m",
        "deliveryPercentage": 68,
        "riskLevel": "high",
        "isDemoGps": True,
    },
    {
        "id": "v2",
        "vehicleNumber": "NER-REL-108",
        "type": "truck",
        "driverId": "dr2",
        "driverName": "Anita Das",
        "currentLocation": {"lat": 26.15, "lng": 91.74},
        "speed": 38,
        "status": "on_route",
        "cargo": "Baby Food & Purified Water",
        "cargoPriority": "high",
        "capacity": 3500,
        "currentLoad": 2800,
        "fuel": 85.0,
        "battery": 80.0,
        "currentDeliveryId": "del2",
        "origin": "Guwahati",
        "destination": "Shillong",
        "eta": "1h 45m",
        "deliveryPercentage": 42,
        "riskLevel": "medium",
        "isDemoGps": True,
    },
]

ROADS_DB = [
    {
        "id": "r1",
        "name": "NH-14",
        "startDistrict": "Guwahati",
        "endDistrict": "Imphal",
        "status": "orange",
        "riskLevel": "high",
        "affectedVehicles": ["v3", "v5"],
        "affectedDeliveries": ["del3"],
        "rainfallMm": 82,
        "trafficLevel": "heavy",
        "roadCondition": "Poor",
        "landslideProb": 76,
        "floodRisk": 32,
        "overallRisk": 81,
        "delayMin": 42,
        "lengthKm": 420,
    },
    {
        "id": "r2",
        "name": "NH-27",
        "startDistrict": "Guwahati",
        "endDistrict": "Shillong",
        "status": "yellow",
        "riskLevel": "medium",
        "affectedVehicles": ["v2"],
        "affectedDeliveries": ["del2"],
        "rainfallMm": 48,
        "trafficLevel": "medium",
        "roadCondition": "Fair",
        "landslideProb": 34,
        "floodRisk": 55,
        "overallRisk": 48,
        "delayMin": 18,
        "lengthKm": 98,
    },
    {
        "id": "r3",
        "name": "NH-2",
        "startDistrict": "Shillong",
        "endDistrict": "Kohima",
        "status": "accessible",
        "riskLevel": "low",
        "affectedVehicles": [],
        "affectedDeliveries": [],
        "rainfallMm": 22,
        "trafficLevel": "low",
        "roadCondition": "Good",
        "landslideProb": 15,
        "floodRisk": 10,
        "overallRisk": 18,
        "delayMin": 0,
        "lengthKm": 198,
    },
]

INCIDENTS_DB = [
    {
        "id": "INC-2048",
        "type": "landslide",
        "severity": "critical",
        "status": "active",
        "location": "NH-14 · Tamenglong Pass",
        "lat": 24.98,
        "lng": 93.62,
        "timestamp": "12 min ago",
        "description": "Massive slope failure and rockfall blocking both lanes.",
        "reportedBy": "Field Unit 07",
        "affectedRoads": ["NH-14"],
        "affectedVehicles": ["v1", "v3"],
        "confidence": 96,
    }
]

WEATHER_DB = [
    {"district": "Guwahati", "temperatureC": 29, "rainfallMm": 42, "humidity": 88, "windKph": 18, "visibilityKm": 6, "condition": "Humid with scattered rain", "warning": "River watch on Brahmaputra", "isDemo": True},
    {"district": "Shillong", "temperatureC": 18, "rainfallMm": 88, "humidity": 94, "windKph": 22, "visibilityKm": 3, "condition": "Heavy monsoon rainfall", "warning": "Hill-road slip caution", "isDemo": True},
    {"district": "Imphal", "temperatureC": 24, "rainfallMm": 61, "humidity": 85, "windKph": 14, "visibilityKm": 5, "condition": "Monsoon showers", "warning": "Landslide watch in Tamenglong", "isDemo": True},
    {"district": "Aizawl", "temperatureC": 22, "rainfallMm": 52, "humidity": 82, "windKph": 12, "visibilityKm": 7, "condition": "Intermittent rain", "warning": "Slippery curves on NH-6", "isDemo": True},
]

@app.get("/")
def root():
    return {"status": "online", "system": "NER-LOGIX AI Core Server", "version": "1.0.0"}

@app.get("/api/vehicles", response_model=List[VehicleSchema])
def get_vehicles():
    return VEHICLES_DB

@app.post("/api/vehicles/location")
def update_vehicle_location(id: str, lat: float, lng: float):
    for v in VEHICLES_DB:
        if v["id"] == id:
            v["currentLocation"] = {"lat": lat, "lng": lng}
            return {"success": True, "vehicle": v}
    raise HTTPException(status_code=404, detail="Vehicle not found")

@app.get("/api/incidents", response_model=List[IncidentSchema])
def get_incidents():
    return INCIDENTS_DB

@app.post("/api/incidents", response_model=IncidentSchema, status_code=201)
def create_incident(incident: IncidentCreate):
    new_inc = incident.dict()
    new_inc["id"] = f"INC-{len(INCIDENTS_DB) + 2050}"
    new_inc["timestamp"] = "Just now"
    new_inc["status"] = "new"
    INCIDENTS_DB.insert(0, new_inc)
    return new_inc

@app.get("/api/roads", response_model=List[RoadSchema])
def get_roads():
    return ROADS_DB

@app.get("/api/weather", response_model=List[WeatherSchema])
def get_weather(district: Optional[str] = Query(None)):
    if district:
        for w in WEATHER_DB:
            if w["district"].lower() == district.lower():
                return [w]
    return WEATHER_DB

@app.post("/api/predict-risk", response_model=RiskPredictionResponse)
def predict_risk(req: RiskPredictionRequest):
    return predict_ai_risk(req)

@app.post("/api/routes/optimize", response_model=List[RouteCandidateSchema])
def optimize_route(req: RouteOptimizationRequest):
    return calculate_alternate_routes(req.origin, req.destination, req.blockedRoadId, INCIDENTS_DB)

@app.get("/api/districts")
def get_districts():
    from backend.database import get_all_districts
    return get_all_districts()

@app.get("/api/deliveries")
def get_deliveries():
    from backend.database import get_all_deliveries
    return get_all_deliveries()

@app.get("/api/alerts")
def get_alerts():
    from backend.database import get_all_alerts
    return get_all_alerts()

@app.get("/api/supplies")
def get_supplies():
    from backend.database import get_all_supplies
    return get_all_supplies()

@app.get("/api/warehouses")
def get_warehouses():
    from backend.database import get_all_warehouses
    return get_all_warehouses()

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
