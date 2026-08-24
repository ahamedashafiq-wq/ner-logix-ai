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
  visibilityKm: number
  condition: string
  warning?: string
  isDemo: boolean
}

export type RouteAccessibility = 'accessible' | 'partially_accessible' | 'high_risk' | 'blocked'
export type MapLayerId = 'traffic' | 'vehicles' | 'incidents' | 'warehouses' | 'hospitals' | 'deliveries' | 'risk'

export interface District {
  id: string
  name: string
  state: string
  lat: number
  lng: number
  accessibilityScore?: number
  roadStatus?: 'open' | 'slow' | 'restricted' | 'blocked'
  weatherRisk?: RiskLevel
  activeIncidents?: number
  delayedDeliveries?: number
  supplyStatus?: 'adequate' | 'watch' | 'shortage'
  riskLevel?: RiskLevel
}

export interface Driver {
  id: string
  name: string
  vehicleId?: string
  status: 'on_duty' | 'off_duty' | 'break'
}

export interface Road {
  id: string
  name: string
  startDistrict: string
  endDistrict: string
  status: 'accessible' | 'yellow' | 'orange' | 'blocked'
  riskLevel: RiskLevel
  affectedVehicles: string[]
  affectedDeliveries: string[]
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
  capacity: number
  currentLoad: number
  fuel: number
  battery?: number
  currentDeliveryId?: string
  origin?: string
  destination?: string
  eta?: string
  riskLevel: RiskLevel
  route?: Route
  isDemoGps?: boolean
}

export type DeliveryPriority = 'critical' | 'high' | 'medium' | 'low'
export type DeliveryStatus = 'created' | 'scheduled' | 'assigned' | 'dispatched' | 'pickup' | 'in_transit' | 'delayed' | 'at_risk' | 'blocked' | 'rerouted' | 'delivered' | 'cancelled'

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
}

export type IncidentType = 'landslide' | 'flood' | 'road_damage' | 'bridge_damage' | 'heavy_rain' | 'traffic' | 'debris' | 'accident' | 'road_blocked' | 'vehicle_breakdown' | 'other'
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
}

export type AlertType = 'road_blocked' | 'landslide_risk' | 'flood_risk' | 'heavy_rain' | 'traffic' | 'vehicle_delay' | 'supply_shortage' | 'route_change' | 'emergency'
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
  category: 'medicines' | 'food' | 'construction' | 'agricultural' | 'rescue'
  name: string
  stock: number
  incoming: number
  outgoing: number
  minimumThreshold: number
  riskLevel: RiskLevel
  daysRemaining: number
  warehouses: { id: string; quantity: number }[]
}

export interface Prediction {
  id: string
  road: string
  district: string
  floodProbability: number
  landslideProbability: number
  trafficProbability: number
  overallRisk: RiskLevel
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

export interface AppState {
  user?: User
  isAuthenticated: boolean
  isEmergencyMode: boolean
  demoMode: boolean
  offlineMode: boolean
  lastSync: string
}

export type KpiItem = KpiItem
export type LogisticsHealth = LogisticsHealth
export type DeliveryStatus = DeliveryStatus
export type DeliveryTrendPoint = DeliveryTrendPoint
export type RiskTrendPoint = RiskTrendPoint
export type RouteCandidate = RouteCandidate
export type StateIncidentPoint = StateIncidentPoint
