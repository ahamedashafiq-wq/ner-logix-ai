from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from backend.app.database import get_db
from backend.app.models import VehicleModel, IncidentModel, RoadModel, WeatherModel
from backend.app.schemas import NearbyMapResponse, VehicleSchema, IncidentSchema, RoadSchema, LocationWeatherResponse
from backend.app.gis.network import haversine_km
from backend.app.routers.weather import WEATHER_STATIONS

router = APIRouter(prefix="/map", tags=["GIS Map"])

@router.get("/nearby", response_model=NearbyMapResponse)
def get_nearby_map_bundle(
    lat: float = Query(..., description="Center latitude"),
    lng: float = Query(..., description="Center longitude"),
    radius: float = Query(80.0, description="Search radius in km"),
    db: Session = Depends(get_db)
):
    # 1. Nearby Vehicles
    all_vehicles = db.query(VehicleModel).all()
    nearby_vehicles = []
    for v in all_vehicles:
        if v.current_lat is not None and v.current_lng is not None:
            if haversine_km(lat, lng, v.current_lat, v.current_lng) <= radius:
                nearby_vehicles.append(VehicleSchema(
                    id=v.id,
                    vehicleNumber=v.vehicle_number,
                    driverId=v.driver_id,
                    driverName=v.driver_name,
                    driverPhone="+91 94350-12890",
                    currentLocation={"lat": v.current_lat, "lng": v.current_lng},
                    speed=v.speed or 0.0,
                    status=v.status,
                    cargo=v.cargo,
                    cargoPriority=v.cargo_priority,
                    fuel=v.fuel,
                    battery=v.battery,
                    origin=v.origin,
                    destination=v.destination,
                    eta=v.eta,
                    deliveryPercentage=v.delivery_percentage,
                    riskLevel=v.risk_level,
                    isDemoGps=v.is_demo_gps
                ))

    # 2. Nearby Incidents
    all_incidents = db.query(IncidentModel).filter(IncidentModel.status != "resolved").all()
    nearby_incidents = []
    for inc in all_incidents:
        if inc.lat is not None and inc.lng is not None:
            if haversine_km(lat, lng, inc.lat, inc.lng) <= radius:
                nearby_incidents.append(IncidentSchema(
                    id=inc.id,
                    type=inc.type,
                    severity=inc.severity,
                    status=inc.status,
                    location=inc.location,
                    lat=inc.lat,
                    lng=inc.lng,
                    district=inc.district,
                    state=inc.state,
                    road=inc.road,
                    description=inc.description,
                    reportedBy=inc.reported_by,
                    source=inc.source or "Field Officer",
                    sourceUrl=inc.source_url,
                    reportedAt=inc.reported_at or inc.timestamp,
                    updatedAt=inc.updated_at or inc.timestamp,
                    timestamp=inc.timestamp,
                    verified=inc.verified if inc.verified is not None else True,
                    confidence=inc.confidence or 90.0,
                    expiresAt=inc.expires_at,
                    affectedRoads=inc.affected_roads or [],
                    affectedVehicles=inc.affected_vehicles or [],
                    photoDataUrl=inc.photo_data_url,
                    isDemo=inc.is_demo or False
                ))

    # 3. Nearby Roads
    all_roads = db.query(RoadModel).all()
    nearby_roads = []
    for r in all_roads:
        start_lat = getattr(r, "start_lat", 26.1445)
        start_lng = getattr(r, "start_lng", 91.7362)
        end_lat = getattr(r, "end_lat", 24.8170)
        end_lng = getattr(r, "end_lng", 93.9368)
        dist = min(
            haversine_km(lat, lng, start_lat, start_lng),
            haversine_km(lat, lng, end_lat, end_lng),
            haversine_km(lat, lng, (start_lat + end_lat)/2.0, (start_lng + end_lng)/2.0)
        )
        if dist <= radius:
            nearby_roads.append(RoadSchema(
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
            ))

    # 4. Location Weather
    nearest_station = "Guwahati"
    min_stn_dist = float("inf")
    for stn_name, stn_coords in WEATHER_STATIONS.items():
        d = haversine_km(lat, lng, stn_coords["lat"], stn_coords["lng"])
        if d < min_stn_dist:
            min_stn_dist = d
            nearest_station = stn_name
            
    obs = db.query(WeatherModel).filter(WeatherModel.district.ilike(f"%{nearest_station}%")).first()
    weather_resp = LocationWeatherResponse(
        latitude=lat,
        longitude=lng,
        district=nearest_station,
        state=WEATHER_STATIONS[nearest_station]["state"],
        temperatureC=obs.temperature_c if obs else 25.0,
        rainfallMm=obs.rainfall_mm if obs else 20.0,
        humidity=obs.humidity if obs else 80.0,
        windKph=obs.wind_kph if obs else 12.0,
        visibilityKm=obs.visibility_km if obs else 8.0,
        soilMoisture=50.0,
        condition=obs.condition if obs else "Clear",
        warning=obs.warning if obs else None,
        stationDistanceKm=round(min_stn_dist, 1),
        source="Open-Meteo Synoptic Grid",
        timestamp=datetime.utcnow().strftime("%H:%M:%S UTC")
    )

    return NearbyMapResponse(
        centerLat=lat,
        centerLng=lng,
        radiusKm=radius,
        vehicles=nearby_vehicles,
        incidents=nearby_incidents,
        roads=nearby_roads,
        weather=weather_resp
    )
