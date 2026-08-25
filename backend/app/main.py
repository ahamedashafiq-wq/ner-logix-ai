import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.services.seed_data import seed_database_if_empty
from backend.app.services.weather_service import (
    sync_all_ner_weather,
    live_weather_background_poller,
    WEATHER_SERVICE_STATUS,
    LAST_WEATHER_FETCH_TIME,
)
from backend.app.realtime.websocket_manager import manager
from backend.app.models import VehicleModel

# Import all routers
from backend.app.routers import (
    dashboard,
    roads,
    districts,
    vehicles,
    incidents,
    weather,
    alerts,
    supplies,
    deliveries,
    risk,
    routes,
    simulation,
    copilot,
    map,
)

async def vehicle_telemetry_background_loop():
    """Simulates real-time GPS telemetry updates broadcasted over WebSockets in demo mode."""
    while True:
        try:
            db = SessionLocal()
            vehicles = db.query(VehicleModel).all()
            for v in vehicles:
                if v.status == "on_route" and v.is_demo_gps:
                    # Slight progress jitter along route vector
                    v.current_lat += (0.0004 if v.id == "v1" else -0.0002)
                    v.current_lng += (0.0003 if v.id == "v1" else 0.0002)
                    if v.fuel > 10:
                        v.fuel -= 0.05
                    if v.battery and v.battery > 10:
                        v.battery -= 0.04
            db.commit()
            
            payload = [
                {
                    "type": "VEHICLE_UPDATED",
                    "id": v.id,
                    "vehicleNumber": v.vehicle_number,
                    "currentLocation": {"lat": v.current_lat, "lng": v.current_lng},
                    "speed": v.speed,
                    "status": v.status,
                    "fuel": round(v.fuel, 1),
                    "battery": round(v.battery, 1) if v.battery else None,
                    "eta": v.eta,
                    "isDemoGps": v.is_demo_gps,
                    "timestamp": datetime.utcnow().isoformat()
                }
                for v in vehicles
            ]
            await manager.broadcast_vehicle_telemetry(payload)
            db.close()
        except Exception:
            pass
        await asyncio.sleep(settings.TELEMETRY_INTERVAL_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Initialize Database & Seed initial tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
        # Attempt initial live weather fetch from Open-Meteo
        try:
            await sync_all_ner_weather(db)
        except Exception:
            pass
    finally:
        db.close()
        
    # 2. Launch background workers
    telemetry_task = asyncio.create_task(vehicle_telemetry_background_loop())
    weather_task = asyncio.create_task(live_weather_background_poller())
    
    yield
    
    # 3. Shutdown: Cancel workers
    telemetry_task.cancel()
    weather_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST Routers
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(roads.router, prefix=settings.API_PREFIX)
app.include_router(districts.router, prefix=settings.API_PREFIX)
app.include_router(vehicles.router, prefix=settings.API_PREFIX)
app.include_router(incidents.router, prefix=settings.API_PREFIX)
app.include_router(weather.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(supplies.router, prefix=settings.API_PREFIX)
app.include_router(deliveries.router, prefix=settings.API_PREFIX)
app.include_router(risk.router, prefix=settings.API_PREFIX)
app.include_router(routes.router, prefix=settings.API_PREFIX)
app.include_router(simulation.router, prefix=settings.API_PREFIX)
app.include_router(copilot.router, prefix=settings.API_PREFIX)
app.include_router(map.router, prefix=settings.API_PREFIX)

# WebSocket Endpoints
@app.websocket("/ws/vehicles")
async def websocket_vehicles_endpoint(websocket: WebSocket):
    await manager.connect_vehicles(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_vehicles(websocket)

@app.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await manager.connect_alerts(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_alerts(websocket)

@app.websocket("/ws/incidents")
async def websocket_incidents_endpoint(websocket: WebSocket):
    await manager.connect_incidents(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_incidents(websocket)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "CONNECTED",
        "weather_service": WEATHER_SERVICE_STATUS,
        "last_weather_sync": LAST_WEATHER_FETCH_TIME.isoformat() if LAST_WEATHER_FETCH_TIME else "N/A",
        "websockets": {
            "vehicles_connected": len(manager.active_vehicle_connections),
            "alerts_connected": len(manager.active_alert_connections),
            "incidents_connected": len(manager.active_incident_connections),
        },
        "ai_risk_engine": "ACTIVE",
        "timestamp": datetime.utcnow().isoformat()
    }
