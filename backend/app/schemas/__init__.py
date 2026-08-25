from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class GeoPoint(BaseModel):
    lat: float
    lng: float

class VehicleSchema(BaseModel):
    id: str
    vehicleNumber: str
    type: str = "truck"
    driverId: str
    driverName: str
    currentLocation: GeoPoint
    speed: float = 0.0
    status: str = "available"
    cargo: Optional[str] = None
    cargoPriority: Optional[str] = "medium"
    capacity: float = 3000.0
    currentLoad: float = 0.0
    fuel: float = 100.0
    battery: Optional[float] = None
    currentDeliveryId: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    eta: Optional[str] = None
    deliveryPercentage: Optional[float] = 0.0
    riskLevel: str = "low"
    isDemoGps: bool = True

class RoadSchema(BaseModel):
    id: str
    name: str
    startDistrict: str
    endDistrict: str
    status: str
    riskLevel: str
    affectedVehicles: List[str] = []
    affectedDeliveries: List[str] = []
    rainfallMm: Optional[float] = 20.0
    trafficLevel: Optional[str] = "low"
    roadCondition: Optional[str] = "Good"
    landslideProb: Optional[int] = 15
    floodRisk: Optional[int] = 10
    overallRisk: Optional[int] = 20
    delayMin: Optional[int] = 0
    lengthKm: Optional[float] = 100.0
    elevationM: Optional[float] = 500.0

class DistrictSchema(BaseModel):
    id: str
    name: str
    state: str
    lat: float
    lng: float
    accessibilityScore: Optional[int] = 75
    connectivityScore: Optional[int] = 75
    connectivityStatus: Optional[str] = "GOOD"
    roadStatus: Optional[str] = "open"
    weatherRisk: Optional[str] = "low"
    activeIncidents: Optional[int] = 0
    delayedDeliveries: Optional[int] = 0
    supplyStatus: Optional[str] = "adequate"
    population: Optional[str] = "100k"
    isolationRisk: Optional[int] = 15
    estimatedIsolationHours: Optional[float] = 48.0

class IncidentCreate(BaseModel):
    type: str
    severity: str
    location: str
    lat: float
    lng: float
    description: str
    reportedBy: str = "Field Officer"
    source: Optional[str] = "Field Officer"
    sourceUrl: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    road: Optional[str] = None
    affectedRoads: List[str] = []
    affectedVehicles: List[str] = []
    confidence: float = 90.0
    verified: bool = True
    photoDataUrl: Optional[str] = None
    isDemo: bool = False

class IncidentSchema(IncidentCreate):
    id: str
    status: str = "active"
    reportedAt: str = "Just now"
    updatedAt: str = "Just now"
    timestamp: str = "Just now"
    expiresAt: Optional[str] = None


class AlertSchema(BaseModel):
    id: str
    type: str
    severity: str
    message: str
    title: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    recommendedAction: Optional[str] = None
    affectedVehicles: List[str] = []
    affectedDeliveries: List[str] = []
    timestamp: str = "Just now"
    resolved: bool = False

class DeliverySchema(BaseModel):
    id: str
    pickupLocation: str
    destination: str
    cargoType: str
    cargoWeight: float
    priority: str
    status: str
    vehicleId: Optional[str] = None
    scheduledTime: str
    eta: Optional[str] = None
    riskLevel: str = "low"
    delayMinutes: Optional[int] = 0

class SupplySchema(BaseModel):
    id: str
    category: str
    name: str
    stock: float
    incoming: float
    outgoing: float
    minimumThreshold: float
    riskLevel: str
    daysRemaining: float
    priorityScore: Optional[int] = 50
    warehouses: List[Dict[str, Any]] = []

class WarehouseSchema(BaseModel):
    id: str
    name: str
    district: str
    lat: float
    lng: float
    capacity: float
    currentInventory: float
    dailyConsumption: Optional[float] = 5.0
    daysRemaining: Optional[float] = 10.0
    supplies: List[Dict[str, Any]] = []

class WeatherSchema(BaseModel):
    district: str
    temperatureC: float
    rainfallMm: float
    humidity: Optional[float] = 80.0
    windKph: float
    visibilityKm: float
    condition: str
    warning: Optional[str] = None
    isDemo: bool = True

class RiskPredictionRequest(BaseModel):
    rainfall: float = 20.0
    rainfall_24h: float = 40.0
    rainfall_72h: float = 90.0
    slope: float = 25.0
    elevation: float = 800.0
    soil_moisture: float = 65.0
    river_level: float = 1.5
    historical_landslides: int = 2
    road_condition: str = "Fair"
    traffic_density: str = "medium"
    bridge_condition: str = "Good"

class RiskPredictionResponse(BaseModel):
    risk_score: int
    risk_level: str
    predicted_event: str
    confidence: float
    contributing_factors: List[str]
    recommended_action: str

class GeoPointSchema(BaseModel):
    lat: float
    lng: float

class RouteSegmentSchema(BaseModel):
    name: str
    fromDistrict: str
    toDistrict: str
    distanceKm: float
    durationMin: float
    trafficLevel: str = "medium"
    rainfallMm: float = 20.0
    landslideRisk: float = 15.0
    floodRisk: float = 10.0
    roadCondition: str = "Good"
    bridgeCondition: str = "Good"
    activeIncidentsCount: int = 0
    status: str = "accessible"

class RouteOptimizationRequest(BaseModel):
    origin: Optional[str] = "Guwahati"
    destination: Optional[str] = "Imphal"
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    vehicle_id: Optional[str] = "NER-MED-204"
    cargo: Optional[str] = "Emergency Medicines"
    priority: Optional[str] = "critical"
    blockedRoadId: Optional[str] = None

class RouteCandidateSchema(BaseModel):
    id: str
    name: str
    distance: float
    estimatedTime: float
    durationInTrafficMin: Optional[float] = None
    riskLevel: str
    riskScore: Optional[int] = None
    trafficLevel: str
    trafficDelayMin: Optional[int] = 0
    weatherCondition: Optional[str] = "Clear"
    activeIncidentsCount: Optional[int] = 0
    score: int
    reason: str
    isRecommended: bool
    accessibility: str
    riskReduction: float = 0.0
    additionalDistanceKm: float = 0.0
    additionalTimeMin: float = 0.0
    summary: Optional[str] = None
    confidence: Optional[float] = 0.92
    cargoSuitability: Optional[str] = "High"
    path: Optional[List[GeoPointSchema]] = []
    segments: Optional[List[RouteSegmentSchema]] = []

class LocationWeatherResponse(BaseModel):
    latitude: float
    longitude: float
    district: str
    state: str
    temperatureC: float
    rainfallMm: float
    humidity: float
    windKph: float
    visibilityKm: float
    soilMoisture: Optional[float] = 45.0
    condition: str
    warning: Optional[str] = None
    stationDistanceKm: float
    source: str = "Open-Meteo"
    timestamp: str

class NearbyIncidentsResponse(BaseModel):
    centerLat: float
    centerLng: float
    radiusKm: float
    totalCount: int
    incidents: List[IncidentSchema]

class NearbyMapResponse(BaseModel):
    centerLat: float
    centerLng: float
    radiusKm: float
    vehicles: List[VehicleSchema]
    incidents: List[IncidentSchema]
    roads: List[RoadSchema]
    weather: Optional[LocationWeatherResponse] = None

class RecommendationRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    cargo_type: str = "Emergency Medicines"
    priority: str = "critical"
    vehicle_id: Optional[str] = None

class RecommendationResponse(BaseModel):
    recommended_route_id: str
    recommended_route_name: str
    reason: str
    cargo_type: str
    priority: str
    risk_score: int
    eta_minutes: float
    distance_km: float
    confidence: float
    warnings: List[str] = []
    candidates: List[RouteCandidateSchema]

class DisasterSimulationRequest(BaseModel):
    rainfall: str = "Heavy"
    riverLevelM: float = 2.5
    traffic: str = "Heavy"
    blockedRoadId: Optional[str] = "r1"
    landslideProbability: int = 80

class CopilotQueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

class CopilotQueryResponse(BaseModel):
    answer: str
    suggestions: List[str] = []
    action_type: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
