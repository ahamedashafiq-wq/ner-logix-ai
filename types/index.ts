export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type GeoPoint = { lat: number; lng: number }

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'logistics_manager' | 'field_officer' | 'driver'
  avatar?: string
}

export interface GpsFix {
  lat: number
  lng: number
  accuracy?: number
  timestamp: number
}

export interface WeatherData {
  district: string
  temperatureC: number
  rainfallMm: number
  windKph: number
  humidity?: number
  visibilityKm: number
  condition: string
  warning?: string
  isDemo: boolean
}

export type RouteAccessibility = 'accessible' | 'partially_accessible' | 'high_risk' | 'blocked'
export type MapLayerId = 'roads' | 'traffic' | 'vehicles' | 'incidents' | 'warehouses' | 'hospitals' | 'deliveries' | 'risk' | 'weather'

export interface District {
  id: string
  name: string
  state: string
  lat: number
  lng: number
  accessibilityScore?: number
  connectivityScore?: number
  connectivityStatus?: 'GOOD' | 'MODERATE' | 'HIGH RISK' | 'CRITICAL'
  roadStatus?: 'open' | 'slow' | 'restricted' | 'blocked'
  weatherRisk?: RiskLevel
  activeIncidents?: number
  delayedDeliveries?: number
  supplyStatus?: 'adequate' | 'watch' | 'shortage'
  riskLevel?: RiskLevel
  population?: string
  accessibleRoadsCount?: number
  totalRoadsCount?: number
}

export interface Driver {
  id: string
  name: string
  vehicleId?: string
  status: 'on_duty' | 'off_duty' | 'break'
}

export type RoadStatus = 'accessible' | 'yellow' | 'orange' | 'blocked' | 'gray'

export interface Road {
  id: string
  name: string
  startDistrict: string
  endDistrict: string
  status: RoadStatus
  riskLevel: RiskLevel
  affectedVehicles: string[]
  affectedDeliveries: string[]
  rainfallMm?: number
  trafficLevel?: 'low' | 'medium' | 'heavy' | 'extreme'
  roadCondition?: 'Good' | 'Fair' | 'Poor' | 'Severely Damaged'
  landslideProb?: number
  floodRisk?: number
  overallRisk?: number
  delayMin?: number
  lengthKm?: number
  elevationM?: number
}

export interface Route {
  id: string
  origin: string
  destination: string
  distance: number
  estimatedTime: number
  currentRoad: string
  progress: number
  waypoints: GeoPoint[]
}

export interface RouteCandidate {
  id: string
  name?: string
  distance: number
  estimatedTime: number
  riskLevel: RiskLevel
  trafficLevel: 'low' | 'medium' | 'high'
  score: number
  reason?: string
  isRecommended: boolean
  accessibility?: RouteAccessibility
  durationInTrafficMin?: number
  path?: GeoPoint[]
  summary?: string
  isDemoScore?: boolean
  riskReduction?: number
  additionalDistanceKm?: number
  additionalTimeMin?: number
}

export interface Vehicle {
  id: string
  vehicleNumber: string
  type: 'truck' | 'van' | 'motorcycle'
  driverId: string
  driverName: string
  currentLocation: GeoPoint
  speed: number
  status: 'available' | 'assigned' | 'on_route' | 'delayed' | 'stopped' | 'emergency' | 'maintenance' | 'offline'
  cargo?: string
  cargoPriority?: 'critical' | 'high' | 'medium' | 'low'
  capacity: number
  currentLoad: number
  fuel: number
  battery?: number
  currentDeliveryId?: string
  origin?: string
  destination?: string
  eta?: string
  deliveryPercentage?: number
  riskLevel: RiskLevel
  route?: Route
  isDemoGps?: boolean
}

export type DeliveryPriority = 'critical' | 'high' | 'medium' | 'low'
export type DeliveryStatus =
  | 'created'
  | 'scheduled'
  | 'assigned'
  | 'dispatched'
  | 'pickup'
  | 'in_transit'
  | 'delayed'
  | 'at_risk'
  | 'blocked'
  | 'rerouted'
  | 'delivered'
  | 'cancelled'

export interface Delivery {
  id: string
  pickupLocation: string
  destination: string
  cargoType: string
  cargoWeight: number
  priority: DeliveryPriority
  status: DeliveryStatus
  vehicleId?: string
  scheduledTime: string
  eta?: string
  createdAt: string
  riskLevel: RiskLevel
  delayMinutes?: number
}

export type IncidentType =
  | 'landslide'
  | 'flood'
  | 'road_damage'
  | 'bridge_damage'
  | 'heavy_rain'
  | 'traffic'
  | 'road_blocked'
  | 'road_blockage'
  | 'accident'
  | 'infrastructure_failure'
  | 'debris'
  | 'vehicle_breakdown'
  | 'other'

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'new' | 'verified' | 'active' | 'resolved'

export interface Incident {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  location: string
  lat: number
  lng: number
  timestamp: string
  description: string
  reportedBy: string
  affectedRoads: string[]
  affectedVehicles: string[]
  confidence: number
  image?: string
  reporter?: string
  photoDataUrl?: string
  source?: 'Field Officer' | 'Weather Service' | 'Government Feed' | 'Verified Authority' | 'System Detection' | string
  sourceUrl?: string
  reportedAt?: string
  updatedAt?: string
  verified?: boolean
  district?: string
  state?: string
  road?: string
  isDemo?: boolean
}

export type AlertType =
  | 'road_blocked'
  | 'landslide_risk'
  | 'flood_risk'
  | 'heavy_rain'
  | 'traffic'
  | 'vehicle_delay'
  | 'supply_shortage'
  | 'critical_supply'
  | 'route_changed'
  | 'route_change'
  | 'severe_weather'
  | 'connectivity_loss'
  | 'emergency'

export type AlertSeverity = 'info' | 'warning' | 'high' | 'critical'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  title?: string
  location?: string
  description?: string
  recommendedAction?: string
  affectedVehicles?: string[]
  affectedDeliveries?: string[]
  timestamp: string
  resolved: boolean
}

export interface Warehouse {
  id: string
  name: string
  district: string
  lat: number
  lng: number
  capacity: number
  currentInventory: number
  dailyConsumption?: number
  daysRemaining?: number
  supplies: WarehouseSupply[]
}

export interface WarehouseSupply {
  supplyId: string
  quantity: number
  unit: string
  minThreshold: number
}

export interface Hospital {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  isDemo: boolean
}

export interface Supply {
  id: string
  category: 'medicines' | 'food' | 'construction' | 'agricultural' | 'fuel' | 'rescue'
  name: string
  stock: number
  incoming: number
  outgoing: number
  minimumThreshold: number
  riskLevel: RiskLevel
  daysRemaining: number
  priorityScore?: number
  warehouses: { id: string; quantity: number }[]
}

export interface RiskScoreBreakdown {
  overallRisk: number
  riskLevel: RiskLevel
  landslideRisk: number
  floodRisk: number
  trafficRisk: number
  roadDamageRisk: number
  factors: string[]
  confidence: number
  predictionText: string
}

export interface Prediction {
  id: string
  road: string
  district: string
  floodProbability: number
  landslideProbability: number
  trafficProbability: number
  roadDamageProbability?: number
  overallRisk: RiskLevel
  riskScore?: number
  factors?: string[]
  confidence: number
  timestamp: string
}

export type RiskPrediction = Prediction

export interface FieldReport {
  id: string
  officerId: string
  officerName: string
  locationLabel: string
  location: GeoPoint
  incidentType: IncidentType
  severity: IncidentSeverity
  description: string
  image?: string
  photoDataUrl?: string
  timestamp: string
  synced: boolean
  syncState?: 'pending' | 'syncing' | 'synced' | 'offline'
}

export interface ImageDetectionResult {
  detected: boolean
  label: string
  confidence: number
  severity: IncidentSeverity
  roadStatus: 'accessible' | 'blocked' | 'warning'
  location?: GeoPoint
  isSimulated?: boolean
}

export interface LogisticsHealth {
  overallScore: number
  roadAccessibility: number
  vehicleAvailability: number
  deliveryReliability: number
  riskLevel: number
  supplyReadiness: number
}

export interface KpiItem {
  label: string
  value: string
  trend: string
  icon: string
}

export interface DeliveryTrendPoint {
  day: string
  delivered: number
  delayed: number
}

export interface RiskTrendPoint {
  time: string
  risk: number
}

export interface StateIncidentPoint {
  state: string
  incidents: number
}

export interface DisasterSimulationParams {
  rainfall: 'Normal' | 'Moderate' | 'Heavy' | 'Extreme'
  floodLevelM: number
  traffic: 'Low' | 'Moderate' | 'Heavy' | 'Extreme'
  blockedRoadId: string
  landslideProbability: number
}

export interface DisasterSimulationResult {
  before: {
    safeRoutes: number
    highRisk: number
    blocked: number
  }
  after: {
    safeRoutes: number
    highRisk: number
    blocked: number
    affectedVehicles: number
    affectedDeliveries: number
    affectedDistricts: number
    alternateRoutesFound: number
    averageDelayMin: number
  }
  appliedAt: string
}

export interface ScenarioTimelineEvent {
  time: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'high' | 'critical'
  completed: boolean
}

export interface AppState {
  user?: User
  isAuthenticated: boolean
  isEmergencyMode: boolean
  demoMode: boolean
  offlineMode: boolean
  lastSync: string
}
