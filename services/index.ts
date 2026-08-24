import { alerts, deliveries, deliveryTrend, districts, drivers, fieldReports, hospitals, incidents, kpis, logisticsHealth, mapStates, predictions, riskTrend, roads, routeCandidates, routes, stateIncidents, supplies, vehicles, warehouses } from '@/mock/data'
import type { Alert, Delivery, District, Driver, FieldReport, Hospital, ImageDetectionResult, Incident, Prediction, Road, Route, RouteCandidate, Supply, Vehicle, Warehouse } from '@/types'

const delay = async <T>(value: T): Promise<T> => value

export const vehicleService = {
  async list(): Promise<Vehicle[]> { return delay(vehicles) },
  async get(id: string) { return delay(vehicles.find((vehicle) => vehicle.id === id)) },
}

export const deliveryService = {
  async list(): Promise<Delivery[]> { return delay(deliveries) },
  async create(input: Partial<Delivery>) {
    return delay({
      id: `del-${Date.now()}`,
      pickupLocation: input.pickupLocation ?? 'Central Hub · Guwahati',
      destination: input.destination ?? 'Imphal',
      cargoType: input.cargoType ?? 'General cargo',
      cargoWeight: input.cargoWeight ?? 0,
      priority: input.priority ?? 'medium',
      status: 'created' as const,
      scheduledTime: input.scheduledTime ?? 'Today',
      createdAt: new Date().toISOString(),
      riskLevel: input.riskLevel ?? 'low',
      ...input,
    } satisfies Delivery)
  },
}

export const routeService = {
  async list(): Promise<Route[]> { return delay(routes) },
  async listRoads(): Promise<Road[]> { return delay(roads) },
  async listCandidates(): Promise<RouteCandidate[]> { return delay(routeCandidates) },
  async optimize(_input: { origin: string; destination: string }): Promise<RouteCandidate[]> { return delay(routeCandidates) },
}

export const incidentService = {
  async list(): Promise<Incident[]> { return delay(incidents) },
  async create(input: Partial<Incident>) {
    return delay({
      id: `INC-${Date.now()}`,
      type: input.type ?? 'road_damage',
      severity: input.severity ?? 'medium',
      status: 'new' as const,
      location: input.location ?? 'Unknown',
      lat: input.lat ?? 0,
      lng: input.lng ?? 0,
      timestamp: 'Just now',
      description: input.description ?? '',
      reportedBy: input.reportedBy ?? 'Command Center',
      affectedRoads: input.affectedRoads ?? [],
      affectedVehicles: input.affectedVehicles ?? [],
      confidence: input.confidence ?? 80,
      ...input,
    } satisfies Incident)
  },
}

export const alertService = {
  async list(): Promise<Alert[]> { return delay(alerts) },
}

export const warehouseService = {
  async list(): Promise<Warehouse[]> { return delay(warehouses) },
}

export const hospitalService = {
  async list(): Promise<Hospital[]> { return delay(hospitals) },
}

export const supplyService = {
  async list(): Promise<Supply[]> { return delay(supplies) },
}

export const predictionService = {
  async list(): Promise<Prediction[]> { return delay(predictions) },
}

export const fieldReportService = {
  async list(): Promise<FieldReport[]> { return delay(fieldReports) },
  async create(input: Partial<FieldReport>) {
    return delay({
      id: `FR-${Date.now()}`,
      officerId: input.officerId ?? 'fo-00',
      officerName: input.officerName ?? 'Field Officer',
      locationLabel: input.locationLabel ?? 'Unspecified',
      location: input.location ?? { lat: 0, lng: 0 },
      incidentType: input.incidentType ?? 'road_damage',
      severity: input.severity ?? 'medium',
      description: input.description ?? '',
      timestamp: 'Just now',
      synced: false,
      ...input,
    } satisfies FieldReport)
  },
}

export const driverService = {
  async list(): Promise<Driver[]> { return delay(drivers) },
}

export const districtService = {
  async list(): Promise<District[]> { return delay(districts) },
}

export const dashboardService = {
  async getKpis() { return delay(kpis) },
  async getHealth() { return delay(logisticsHealth) },
  async getDeliveryTrend() { return delay(deliveryTrend) },
  async getRiskTrend() { return delay(riskTrend) },
  async getStateIncidents() { return delay(stateIncidents) },
  async getMapStates() { return delay([...mapStates]) },
}

export const mapService = {
  async getRegionData() {
    return delay({ districts, vehicles, incidents, warehouses, hospitals, roads })
  },
}

export const authService = {
  async login(email: string, _password: string) {
    return delay({ id: 'u1', email, name: 'Aarav Sharma', role: 'admin' as const })
  },
}

export const simulationService = {
  async run(type: string) {
    return delay({ type, roadStatus: 'blocked' as const, affectedVehicles: 8, affectedDeliveries: 12, alternateRoute: 'Route B', newEta: '7h 58m', risk: 'low' as const })
  },
}

export const imageDetectionService = {
  async analyze(_file: File): Promise<ImageDetectionResult> {
    return delay({ detected: true, label: 'Landslide detected', confidence: 94.6, severity: 'high', roadStatus: 'blocked', location: { lat: 24.98, lng: 93.62 }, isSimulated: true })
  },
}
