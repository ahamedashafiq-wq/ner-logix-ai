from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class GeoPointSchema(BaseModel):
    lat: float
    lng: float

class VehicleSchema(BaseModel):
    id: str
    vehicleNumber: str
    type: str
    driverId: str
    driverName: str
    currentLocation: GeoPointSchema
    speed: float
    status: str
    cargo: Optional[str] = None
    cargoPriority: Optional[str] = None
    capacity: float
    currentLoad: float
    fuel: float
    battery: Optional[float] = None
    currentDeliveryId: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    eta: Optional[str] = None
    deliveryPercentage: Optional[float] = None
    riskLevel: str
    isDemoGps: bool = True

class IncidentCreate(BaseModel):
    type: str
    severity: str
    location: str
    lat: float
    lng: float
    description: str
    reportedBy: str
    affectedRoads: List[str] = []
    affectedVehicles: List[str] = []
    confidence: float = 85.0

class IncidentSchema(IncidentCreate):
    id: str
    timestamp: str
    status: str

class RoadSchema(BaseModel):
    id: str
    name: str
    startDistrict: str
    endDistrict: str
    status: str
    riskLevel: str
    affectedVehicles: List[str] = []
    affectedDeliveries: List[str] = []
    rainfallMm: Optional[float] = None
    trafficLevel: Optional[str] = None
    roadCondition: Optional[str] = None
    landslideProb: Optional[float] = None
    floodRisk: Optional[float] = None
    overallRisk: Optional[float] = None
    delayMin: Optional[int] = None
    lengthKm: Optional[float] = None

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
    rainfallMm: float = 20.0
    temperatureC: float = 24.0
    humidity: float = 80.0
    terrainSlopeDeg: float = 25.0
    roadCondition: str = "Fair"
    trafficDensity: str = "medium"
    previousLandslide: bool = False
    previousFlood: bool = False
    riverLevelAlert: bool = False
    historicalIncidents: int = 1

class RiskPredictionResponse(BaseModel):
    overallRisk: int
    riskLevel: str
    landslideRisk: int
    floodRisk: int
    trafficRisk: int
    roadDamageRisk: int
    factors: List[str]
    confidence: float
    predictionText: str

class RouteOptimizationRequest(BaseModel):
    origin: str
    destination: str
    blockedRoadId: Optional[str] = None

class RouteCandidateSchema(BaseModel):
    id: str
    name: str
    distance: float
    estimatedTime: float
    riskLevel: str
    trafficLevel: str
    score: int
    reason: str
    isRecommended: bool
    accessibility: str
    riskReduction: float = 0.0
    additionalDistanceKm: float = 0.0
    additionalTimeMin: float = 0.0

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
    riskLevel: str

class DistrictSchema(BaseModel):
    id: str
    name: str
    state: str
    lat: float
    lng: float
    connectivityScore: int
    connectivityStatus: str
    weatherRisk: str

class AlertSchema(BaseModel):
    id: str
    type: str
    severity: str
    message: str
    location: Optional[str] = None
    timestamp: str
    resolved: bool

class SupplySchema(BaseModel):
    id: str
    category: str
    name: str
    stock: float
    minimumThreshold: float
    riskLevel: str
    daysRemaining: float
    priorityScore: int

class WarehouseSchema(BaseModel):
    id: str
    name: str
    district: str
    lat: float
    lng: float
    capacity: float
    currentInventory: float
    dailyConsumption: float
    daysRemaining: float
