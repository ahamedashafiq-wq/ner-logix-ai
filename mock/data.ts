import type {
  Alert,
  Delivery,
  DeliveryStatus,
  DeliveryTrendPoint,
  District,
  Driver,
  FieldReport,
  Hospital,
  Incident,
  KpiItem,
  LogisticsHealth,
  Prediction,
  RiskLevel,
  RiskTrendPoint,
  Road,
  Route,
  RouteCandidate,
  StateIncidentPoint,
  Supply,
  User,
  Vehicle,
  Warehouse,
} from '@/types'

export const districts: District[] = [
  { id: 'd1', name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, accessibilityScore: 82, roadStatus: 'slow', weatherRisk: 'medium', activeIncidents: 4, delayedDeliveries: 3, supplyStatus: 'watch', riskLevel: 'medium' },
  { id: 'd2', name: 'Tawang', state: 'Arunachal Pradesh', lat: 27.586, lng: 91.859, accessibilityScore: 54, roadStatus: 'restricted', weatherRisk: 'high', activeIncidents: 2, delayedDeliveries: 2, supplyStatus: 'shortage', riskLevel: 'high' },
  { id: 'd3', name: 'Imphal', state: 'Manipur', lat: 24.817, lng: 93.9368, accessibilityScore: 61, roadStatus: 'restricted', weatherRisk: 'high', activeIncidents: 6, delayedDeliveries: 4, supplyStatus: 'watch', riskLevel: 'high' },
  { id: 'd4', name: 'Shillong', state: 'Meghalaya', lat: 25.5788, lng: 91.8933, accessibilityScore: 74, roadStatus: 'slow', weatherRisk: 'medium', activeIncidents: 3, delayedDeliveries: 2, supplyStatus: 'adequate', riskLevel: 'medium' },
  { id: 'd5', name: 'Aizawl', state: 'Mizoram', lat: 23.7271, lng: 92.7176, accessibilityScore: 68, roadStatus: 'slow', weatherRisk: 'medium', activeIncidents: 2, delayedDeliveries: 1, supplyStatus: 'adequate', riskLevel: 'medium' },
  { id: 'd6', name: 'Kohima', state: 'Nagaland', lat: 25.6751, lng: 94.1086, accessibilityScore: 63, roadStatus: 'restricted', weatherRisk: 'medium', activeIncidents: 3, delayedDeliveries: 2, supplyStatus: 'watch', riskLevel: 'high' },
  { id: 'd7', name: 'Agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868, accessibilityScore: 79, roadStatus: 'open', weatherRisk: 'low', activeIncidents: 1, delayedDeliveries: 1, supplyStatus: 'adequate', riskLevel: 'low' },
  { id: 'd8', name: 'Gangtok', state: 'Sikkim', lat: 27.3389, lng: 88.6065, accessibilityScore: 58, roadStatus: 'restricted', weatherRisk: 'high', activeIncidents: 2, delayedDeliveries: 2, supplyStatus: 'watch', riskLevel: 'high' },
]

const locations = [
  { name: 'Guwahati', lat: 26.1445, lng: 91.7362 },
  { name: 'Shillong', lat: 25.5788, lng: 91.8933 },
  { name: 'Imphal', lat: 24.817, lng: 93.9368 },
  { name: 'Kohima', lat: 25.6751, lng: 94.1086 },
  { name: 'Aizawl', lat: 23.7271, lng: 92.7176 },
  { name: 'Agartala', lat: 23.8315, lng: 91.2868 },
] as const

const vehicleStatuses: Vehicle['status'][] = ['on_route', 'on_route', 'assigned', 'available', 'delayed', 'on_route']
const vehicleRisks: RiskLevel[] = ['low', 'low', 'medium', 'low', 'high', 'low']
const driverNames = ['Raj Kumar', 'Anita Das', 'Bikash Singh', 'Maya Devi'] as const
const cargoTypes = ['Medical Supplies', 'Rice & Pulses', 'Rescue Equipment', 'Vaccines'] as const

export const vehicles: Vehicle[] = Array.from({ length: 24 }, (_, index) => {
  const loc = locations[index % locations.length]
  const status = vehicleStatuses[index % vehicleStatuses.length]
  return {
    id: `v${index + 1}`,
    vehicleNumber: `NER${String(104 + index).padStart(3, '0')}`,
    type: index % 4 === 0 ? 'van' : 'truck',
    driverId: `dr${index + 1}`,
    driverName: driverNames[index % 4],
    currentLocation: { lat: loc.lat + ((index % 3) - 1) * 0.12, lng: loc.lng + ((index % 4) - 2) * 0.12 },
    speed: status === 'on_route' ? 36 + (index % 16) : 0,
    status,
    cargo: cargoTypes[index % 4],
    capacity: 1200,
    currentLoad: 480 + (index * 37) % 420,
    fuel: 48 + (index * 7) % 48,
    battery: 78,
    currentDeliveryId: `del${(index % 15) + 1}`,
    origin: loc.name,
    destination: locations[(index + 1) % locations.length].name,
    eta: `${String(1 + (index % 4)).padStart(2, '0')}:${String(18 + (index % 40)).padStart(2, '0')}`,
    riskLevel: vehicleRisks[index % vehicleRisks.length],
    isDemoGps: true,
  }
})

export const drivers: Driver[] = vehicles.map((vehicle) => ({
  id: vehicle.driverId,
  name: vehicle.driverName,
  vehicleId: vehicle.id,
  status: vehicle.status === 'offline' || vehicle.status === 'available' ? 'off_duty' : 'on_duty',
}))

const deliveryStatuses: DeliveryStatus[] = ['in_transit', 'assigned', 'delayed', 'delivered']
const deliveryPriorities: Delivery['priority'][] = ['medium', 'high', 'critical', 'medium']

export const deliveries: Delivery[] = Array.from({ length: 18 }, (_, index) => ({
  id: `del${index + 1}`,
  pickupLocation: index % 2 ? 'Warehouse B · Shillong' : 'Central Hub · Guwahati',
  destination: locations[(index + 1) % locations.length].name,
  cargoType: ['Medicines', 'Food', 'Rescue equipment', 'Construction materials'][index % 4],
  cargoWeight: 320 + (index * 113) % 680,
  priority: index % 5 === 0 ? 'critical' : deliveryPriorities[index % 3],
  status: deliveryStatuses[index % 4],
  vehicleId: `v${(index % 18) + 1}`,
  scheduledTime: 'Today · 14:30',
  eta: `${String(1 + (index % 4)).padStart(2, '0')}:${String(18 + (index % 40)).padStart(2, '0')}`,
  createdAt: '2026-08-23T08:30:00Z',
  riskLevel: index % 6 === 0 ? 'high' : 'low',
}))

export const incidents: Incident[] = [
  { id: 'INC-2048', type: 'landslide', severity: 'high', status: 'active', location: 'NH-14 · Tamenglong', lat: 24.98, lng: 93.62, timestamp: '12 min ago', description: 'Slope failure blocking one lane after overnight rainfall.', reportedBy: 'Field Unit 07', affectedRoads: ['NH-14'], affectedVehicles: ['v5', 'v13'], confidence: 94 },
  { id: 'INC-2047', type: 'flood', severity: 'critical', status: 'verified', location: 'Brahmaputra Bridge · Guwahati', lat: 26.18, lng: 91.75, timestamp: '28 min ago', description: 'Water level approaching bridge access road.', reportedBy: 'Assam Control', affectedRoads: ['NH-27'], affectedVehicles: ['v2', 'v9'], confidence: 88 },
  { id: 'INC-2046', type: 'heavy_rain', severity: 'medium', status: 'active', location: 'East Khasi Hills', lat: 25.42, lng: 91.89, timestamp: '41 min ago', description: 'Visibility reduced below 100 metres. Drive with caution.', reportedBy: 'Weather Watch', affectedRoads: ['SH-5'], affectedVehicles: [], confidence: 97 },
  { id: 'INC-2045', type: 'road_damage', severity: 'high', status: 'new', location: 'NH-2 · Kohima', lat: 25.67, lng: 94.11, timestamp: '1 hr ago', description: 'Pavement deformation reported near the northern bypass.', reportedBy: 'Driver NER118', affectedRoads: ['NH-2'], affectedVehicles: ['v15'], confidence: 79 },
  { id: 'INC-2044', type: 'debris', severity: 'low', status: 'resolved', location: 'NH-6 · Aizawl', lat: 23.73, lng: 92.71, timestamp: '2 hrs ago', description: 'Fallen branches cleared from shoulder.', reportedBy: 'Mizoram PWD', affectedRoads: ['NH-6'], affectedVehicles: [], confidence: 92 },
]

export const alerts: Alert[] = [
  { id: 'a1', type: 'landslide_risk', severity: 'critical', message: 'High landslide risk detected on NH-14 near Tamenglong', affectedVehicles: ['v5', 'v13'], timestamp: '12 min ago', resolved: false },
  { id: 'a2', type: 'flood_risk', severity: 'high', message: 'Brahmaputra water level rising near Guwahati logistics corridor', affectedDeliveries: ['del2', 'del9'], timestamp: '28 min ago', resolved: false },
  { id: 'a3', type: 'vehicle_delay', severity: 'warning', message: 'Vehicle NER108 delayed by 34 minutes due to weather', affectedVehicles: ['v5'], timestamp: '41 min ago', resolved: false },
  { id: 'a4', type: 'supply_shortage', severity: 'warning', message: 'Medicine stock at Warehouse A below minimum threshold', timestamp: '1 hr ago', resolved: false },
]

export const warehouses: Warehouse[] = [
  { id: 'w1', name: 'Central Hub · Guwahati', district: 'Guwahati', lat: 26.15, lng: 91.74, capacity: 88, currentInventory: 76, supplies: [{ supplyId: 's1', quantity: 18, unit: 'pallets', minThreshold: 30 }] },
  { id: 'w2', name: 'Regional Hub · Shillong', district: 'Shillong', lat: 25.58, lng: 91.9, capacity: 72, currentInventory: 63, supplies: [{ supplyId: 's3', quantity: 42, unit: 'kits', minThreshold: 30 }] },
  { id: 'w3', name: 'Eastern Hub · Imphal', district: 'Imphal', lat: 24.82, lng: 93.94, capacity: 64, currentInventory: 48, supplies: [{ supplyId: 's4', quantity: 36, unit: 'kits', minThreshold: 25 }] },
]

export const hospitals: Hospital[] = [
  { id: 'h1', name: 'GMCH Guwahati', address: 'Bhangagarh, Guwahati, Assam', lat: 26.145, lng: 91.736, isDemo: false },
  { id: 'h2', name: 'NEIGRIHMS Shillong', address: 'Mawdiangdiang, Shillong, Meghalaya', lat: 25.578, lng: 91.938, isDemo: false },
  { id: 'h3', name: 'RIMS Imphal', address: 'Lamphelpat, Imphal, Manipur', lat: 24.816, lng: 93.936, isDemo: false },
  { id: 'h4', name: 'STNM Hospital Gangtok', address: 'Gangtok, Sikkim', lat: 27.331, lng: 88.614, isDemo: false },
]

export const supplies: Supply[] = [
  { id: 's1', category: 'medicines', name: 'Essential medicines', stock: 18, incoming: 120, outgoing: 84, minimumThreshold: 30, riskLevel: 'critical', daysRemaining: 2, warehouses: [{ id: 'w1', quantity: 18 }] },
  { id: 's2', category: 'food', name: 'Food & grains', stock: 74, incoming: 420, outgoing: 190, minimumThreshold: 35, riskLevel: 'low', daysRemaining: 12, warehouses: [{ id: 'w1', quantity: 74 }] },
  { id: 's3', category: 'rescue', name: 'Rescue equipment', stock: 42, incoming: 80, outgoing: 24, minimumThreshold: 30, riskLevel: 'medium', daysRemaining: 8, warehouses: [{ id: 'w2', quantity: 42 }] },
  { id: 's4', category: 'construction', name: 'Bridge repair kits', stock: 36, incoming: 30, outgoing: 12, minimumThreshold: 25, riskLevel: 'medium', daysRemaining: 9, warehouses: [{ id: 'w3', quantity: 36 }] },
]

export const predictions: Prediction[] = [
  { id: 'p1', road: 'NH-14', district: 'Tamenglong', floodProbability: 42, landslideProbability: 76, trafficProbability: 61, overallRisk: 'high', confidence: 89, timestamp: 'Next 6 hours' },
  { id: 'p2', road: 'NH-27', district: 'Guwahati', floodProbability: 68, landslideProbability: 21, trafficProbability: 74, overallRisk: 'high', confidence: 92, timestamp: 'Next 6 hours' },
  { id: 'p3', road: 'SH-5', district: 'East Khasi Hills', floodProbability: 34, landslideProbability: 58, trafficProbability: 33, overallRisk: 'medium', confidence: 84, timestamp: 'Next 12 hours' },
]

export const logisticsHealth: LogisticsHealth = {
  overallScore: 91,
  roadAccessibility: 88,
  vehicleAvailability: 94,
  deliveryReliability: 92,
  riskLevel: 85,
  supplyReadiness: 96,
}

export const routeCandidates: RouteCandidate[] = [
  { id: 'route-a', distance: 420, estimatedTime: 440, riskLevel: 'high', trafficLevel: 'high', score: 58, isRecommended: false },
  { id: 'route-b', distance: 445, estimatedTime: 465, riskLevel: 'low', trafficLevel: 'low', score: 91, reason: 'Lower disruption risk despite being longer.', isRecommended: true },
  { id: 'route-c', distance: 401, estimatedTime: 490, riskLevel: 'critical', trafficLevel: 'medium', score: 42, isRecommended: false },
]

export const routes: Route[] = [
  { id: 'rt-1', origin: 'Guwahati', destination: 'Imphal', distance: 420, estimatedTime: 440, currentRoad: 'NH-14', progress: 62, waypoints: [{ lat: 26.14, lng: 91.73 }, { lat: 24.81, lng: 93.93 }] },
  { id: 'rt-2', origin: 'Shillong', destination: 'Kohima', distance: 198, estimatedTime: 310, currentRoad: 'NH-2', progress: 41, waypoints: [{ lat: 25.57, lng: 91.89 }, { lat: 25.67, lng: 94.1 }] },
  { id: 'rt-3', origin: 'Guwahati', destination: 'Aizawl', distance: 445, estimatedTime: 465, currentRoad: 'NH-6', progress: 28, waypoints: [{ lat: 26.14, lng: 91.73 }, { lat: 23.72, lng: 92.71 }] },
]

export const roads: Road[] = [
  { id: 'r1', name: 'NH-14', startDistrict: 'Guwahati', endDistrict: 'Imphal', status: 'orange', riskLevel: 'high', affectedVehicles: ['v5', 'v13'], affectedDeliveries: ['del2'] },
  { id: 'r2', name: 'NH-27', startDistrict: 'Guwahati', endDistrict: 'Shillong', status: 'yellow', riskLevel: 'medium', affectedVehicles: ['v2'], affectedDeliveries: ['del9'] },
  { id: 'r3', name: 'NH-2', startDistrict: 'Shillong', endDistrict: 'Kohima', status: 'accessible', riskLevel: 'low', affectedVehicles: [], affectedDeliveries: [] },
]

export const fieldReports: FieldReport[] = [
  { id: 'FR-881', officerId: 'fo-07', officerName: 'Field Unit 07', locationLabel: 'NH-14 · Tamenglong', location: { lat: 24.98, lng: 93.62 }, incidentType: 'landslide', severity: 'high', description: 'Slope movement observed after overnight rain. One lane reduced.', timestamp: '18 min ago', synced: true },
  { id: 'FR-880', officerId: 'fo-12', officerName: 'Assam Control', locationLabel: 'Brahmaputra Bridge · Guwahati', location: { lat: 26.18, lng: 91.75 }, incidentType: 'flood', severity: 'critical', description: 'Water approaching access road. Requesting diversion support.', timestamp: '36 min ago', synced: true },
  { id: 'FR-879', officerId: 'fo-04', officerName: 'East Khasi Watch', locationLabel: 'East Khasi Hills', location: { lat: 25.42, lng: 91.89 }, incidentType: 'heavy_rain', severity: 'medium', description: 'Low visibility corridor. Convoy advised to hold.', timestamp: '1 hr ago', synced: false },
]

export const deliveryTrend: DeliveryTrendPoint[] = [
  { day: 'Mon', delivered: 920, delayed: 32 },
  { day: 'Tue', delivered: 1080, delayed: 27 },
  { day: 'Wed', delivered: 1160, delayed: 18 },
  { day: 'Thu', delivered: 1120, delayed: 22 },
  { day: 'Fri', delivered: 1290, delayed: 13 },
  { day: 'Sat', delivered: 1240, delayed: 13 },
  { day: 'Sun', delivered: 1180, delayed: 19 },
]

export const riskTrend: RiskTrendPoint[] = [
  { time: '06:00', risk: 32 },
  { time: '09:00', risk: 41 },
  { time: '12:00', risk: 48 },
  { time: '15:00', risk: 53 },
  { time: '18:00', risk: 46 },
  { time: '21:00', risk: 39 },
]

export const stateIncidents: StateIncidentPoint[] = [
  { state: 'Assam', incidents: 8 },
  { state: 'Manipur', incidents: 6 },
  { state: 'Meghalaya', incidents: 4 },
  { state: 'Nagaland', incidents: 3 },
  { state: 'Mizoram', incidents: 2 },
]

export const demoUser: User = { id: 'u1', email: 'ops@nerlogix.ai', name: 'Aarav Sharma', role: 'admin' }
export const mapStates = ['Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Tripura', 'Sikkim'] as const

export const kpis: KpiItem[] = [
  { label: 'Active vehicles', value: '247', trend: '+12.4%', icon: 'truck' },
  { label: 'Deliveries today', value: '1,240', trend: '+8.2%', icon: 'package' },
  { label: 'Active incidents', value: '18', trend: '-3.1%', icon: 'triangle' },
  { label: 'Accessible roads', value: '82%', trend: '+2.6%', icon: 'route' },
  { label: 'Critical alerts', value: '7', trend: '+2', icon: 'bell' },
  { label: 'Delayed deliveries', value: '13', trend: '-18.7%', icon: 'clock' },
  { label: 'Essential supply', value: '87%', trend: '-4.3%', icon: 'boxes' },
  { label: 'Logistics health', value: '91%', trend: '+5.1%', icon: 'activity' },
]

export function getDemoData() {
  return { districts, vehicles, drivers, deliveries, incidents, alerts, warehouses, hospitals, supplies, predictions, logisticsHealth, routeCandidates, routes, roads, fieldReports }
}
