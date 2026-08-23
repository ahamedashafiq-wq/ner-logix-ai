// User & Auth
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'logistics_manager' | 'field_officer' | 'driver'
  avatar?: string
}

// Geography
export interface District {
  id: string
  name: string
  state: string
  lat: number
  lng: number
}

export interface Road {
  id: string
  name: string
  startDistrict: string
  endDistrict: string
  status: 'accessible' | 'yellow' | 'orange' | 'blocked'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  affectedVehicles: string[]
  affectedDeliveries: string[]
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

// Vehicles
export interface Vehicle {
  id: string
  vehicleNumber: string
  type: 'truck' | 'van' | 'motorcycle'
  driverId: string
  driverName: string
  currentLocation: { lat: number; lng: number }
  speed: number
  status: 'available' | 'assigned' | 'on_route' | 'delayed' | 'stopped' | 'emergency' | 'maintenance' | 'offline'
  cargo?: string
  capacity: number
  currentLoad: number
  fuel: number
  battery?: number
  currentDeliveryId?: string
  destination?: string
  eta?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  route?: Route
}

// Deliveries
export type DeliveryPriority = 'critical' | 'high' | 'medium' | 'low'
export type DeliveryStatus = 'created' | 'assigned' | 'pickup' | 'in_transit' | 'delayed' | 'rerouted' | 'delivered' | 'cancelled'

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
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

// Routes
export interface Route {
  id: string
  origin: string
  destination: string
  distance: number
  estimatedTime: number
  currentRoad: string
  progress: number
  waypoints: { lat: number; lng: number }[]
}

export interface RouteCandidate {
  id: string
  distance: number
  estimatedTime: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  trafficLevel: 'low' | 'medium' | 'high'
  score: number
  reason?: string
  isRecommended: boolean
}

// Incidents
export type IncidentType = 'landslide' | 'flood' | 'road_damage' | 'bridge_damage' | 'heavy_rain' | 'traffic' | 'debris' | 'accident'
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
}

// Alerts
export type AlertType = 'road_blocked' | 'landslide_risk' | 'flood_risk' | 'heavy_rain' | 'traffic' | 'vehicle_delay' | 'supply_shortage' | 'route_change' | 'emergency'
export type AlertSeverity = 'info' | 'warning' | 'high' | 'critical'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  affectedVehicles?: string[]
  affectedDeliveries?: string[]
  timestamp: string
  resolved: boolean
}

// Supplies
export interface Supply {
  id: string
  category: 'medicines' | 'food' | 'construction' | 'agricultural' | 'rescue'
  name: string
  stock: number
  incoming: number
  outgoing: number
  minimumThreshold: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  daysRemaining: number
  warehouses: { id: string; quantity: number }[]
}

// Predictions
export interface RiskPrediction {
  id: string
  road: string
  district: string
  floodProbability: number
  landslideProbability: number
  trafficProbability: number
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  timestamp: string
}

// Field Reports
export interface FieldReport {
  id: string
  officerId: string
  location: { lat: number; lng: number }
  incidentType: IncidentType
  severity: IncidentSeverity
  description: string
  image?: string
  timestamp: string
  synced: boolean
}

// Image Detection Result
export interface ImageDetectionResult {
  detected: boolean
  label: string
  confidence: number
  severity: IncidentSeverity
  roadStatus: 'accessible' | 'blocked' | 'warning'
  location?: { lat: number; lng: number }
  isSimulated?: boolean
}

// Logistics Health
export interface LogisticsHealth {
  overallScore: number
  roadAccessibility: number
  vehicleAvailability: number
  deliveryReliability: number
  riskLevel: number
  supplyReadiness: number
}

// Application State
export interface AppState {
  user?: User
  isAuthenticated: boolean
  isEmergencyMode: boolean
  demoMode: boolean
  offlineMode: boolean
  lastSync: string
}
