import type {
  Alert,
  Delivery,
  DisasterSimulationParams,
  DisasterSimulationResult,
  District,
  Incident,
  KpiItem,
  LogisticsHealth,
  Road,
  Supply,
  Vehicle,
  Warehouse,
  WeatherData,
} from '@/types'

/**
 * Computes dynamic real-time KPIs for the NER-LOGIX central command center.
 */
export function computeKpis(input: {
  vehicles: Vehicle[]
  deliveries: Delivery[]
  incidents: Incident[]
  alerts: Alert[]
  roads: Road[]
  supplies: Supply[]
  districts?: District[]
  health: LogisticsHealth
}): KpiItem[] {
  const activeVehicles = input.vehicles.filter(
    (vehicle) => vehicle.status !== 'offline' && vehicle.status !== 'maintenance'
  ).length

  const activeDeliveries = input.deliveries.filter(
    (delivery) => delivery.status !== 'delivered' && delivery.status !== 'cancelled'
  ).length

  const criticalIncidents = input.incidents.filter(
    (incident) => (incident.severity === 'critical' || incident.severity === 'high') && incident.status !== 'resolved'
  ).length

  const blockedRoads = input.roads.filter((road) => road.status === 'blocked').length
  const highRiskCorridors = input.roads.filter((road) => road.status === 'orange' || road.riskLevel === 'high' || road.riskLevel === 'critical').length

  const delayedDeliveries = input.deliveries.filter(
    (delivery) => delivery.status === 'delayed' || delivery.status === 'at_risk' || delivery.status === 'blocked'
  ).length

  const affectedDistrictsCount = new Set([
    ...input.incidents.filter((i) => i.status !== 'resolved').map((i) => i.location.split('·')[0].trim()),
    ...input.roads.filter((r) => r.status === 'blocked' || r.status === 'orange').flatMap((r) => [r.startDistrict, r.endDistrict]),
  ]).size

  const criticalSuppliesInTransit = input.deliveries.filter(
    (d) => d.priority === 'critical' && d.status !== 'delivered'
  ).length

  return [
    { label: 'Active vehicles', value: String(activeVehicles), trend: '+12.4%', icon: 'truck' },
    { label: 'Active deliveries', value: String(activeDeliveries), trend: '+8.2%', icon: 'package' },
    { label: 'Critical incidents', value: String(criticalIncidents), trend: '+3', icon: 'triangle' },
    { label: 'Blocked roads', value: String(blockedRoads), trend: blockedRoads > 0 ? `+${blockedRoads}` : '0', icon: 'route' },
    { label: 'High-risk corridors', value: String(highRiskCorridors), trend: '+2', icon: 'bell' },
    { label: 'Delayed deliveries', value: String(delayedDeliveries), trend: '-18.7%', icon: 'clock' },
    { label: 'Districts affected', value: String(Math.max(1, affectedDistrictsCount)), trend: 'Watch', icon: 'boxes' },
    { label: 'Critical supplies in transit', value: String(criticalSuppliesInTransit), trend: 'Priority', icon: 'activity' },
  ]
}

/**
 * Calculates District Connectivity Score:
 * Connectivity Score = road availability (40%) + weather accessibility (25%) + transport availability (20%) - incident penalty (15%)
 */
export function computeDistrictConnectivity(
  district: District,
  roads: Road[],
  weather: WeatherData | null,
  incidents: Incident[]
): { score: number; status: 'GOOD' | 'MODERATE' | 'HIGH RISK' | 'CRITICAL' } {
  const districtRoads = roads.filter(
    (r) => r.startDistrict.toLowerCase() === district.name.toLowerCase() || r.endDistrict.toLowerCase() === district.name.toLowerCase()
  )

  const openRoads = districtRoads.filter((r) => r.status !== 'blocked').length
  const roadAvailability = districtRoads.length ? (openRoads / districtRoads.length) * 100 : (district.accessibilityScore ?? 75)

  const rain = weather?.rainfallMm ?? 35
  const weatherAccessibility = Math.max(10, 100 - rain * 0.7)

  const districtIncidents = incidents.filter(
    (i) => i.status !== 'resolved' && i.location.toLowerCase().includes(district.name.toLowerCase())
  )
  const incidentPenalty = districtIncidents.reduce((sum, inc) => sum + (inc.severity === 'critical' ? 25 : inc.severity === 'high' ? 15 : 8), 0)

  const transportAvailability = 85 - (district.delayedDeliveries ?? 0) * 8

  const composite = Math.round(
    roadAvailability * 0.40 +
    weatherAccessibility * 0.25 +
    transportAvailability * 0.20 -
    Math.min(30, incidentPenalty * 0.15)
  )

  const score = Math.max(15, Math.min(98, composite))
  const status: 'GOOD' | 'MODERATE' | 'HIGH RISK' | 'CRITICAL' =
    score >= 75 ? 'GOOD' : score >= 55 ? 'MODERATE' : score >= 35 ? 'HIGH RISK' : 'CRITICAL'

  return { score, status }
}

/**
 * Computes Supply Priority Score (0 - 100) for inventory items.
 * Prioritizes medicines and lifesaving items with low remaining days.
 */
export function computeSupplyPriorityScore(supply: Supply): number {
  const categoryWeight: Record<Supply['category'], number> = {
    medicines: 45,
    fuel: 35,
    rescue: 30,
    food: 25,
    agricultural: 15,
    construction: 15,
  }

  const baseWeight = categoryWeight[supply.category] ?? 20
  const stockDeficitRatio = Math.max(0, 1 - supply.stock / Math.max(1, supply.minimumThreshold)) * 35
  const urgencyFactor = supply.daysRemaining <= 3 ? 20 : supply.daysRemaining <= 7 ? 10 : 0

  return Math.min(99, Math.round(baseWeight + stockDeficitRatio + urgencyFactor))
}

/**
 * Computes Logistics Health Score.
 */
export function computeHealth(
  vehicles: Vehicle[],
  deliveries: Delivery[],
  incidents: Incident[],
  roads: Road[]
): LogisticsHealth {
  const active = vehicles.filter((v) => v.status !== 'offline').length
  const delayed = deliveries.filter((d) => d.status === 'delayed' || d.status === 'at_risk' || d.status === 'blocked').length
  const openRoads = roads.filter((r) => r.status !== 'blocked').length

  const roadAccessibility = roads.length ? Math.round((openRoads / roads.length) * 100) : 84
  const vehicleAvailability = vehicles.length ? Math.round((active / vehicles.length) * 100) : 92
  const deliveryReliability = deliveries.length ? Math.round(((deliveries.length - delayed) / deliveries.length) * 100) : 88
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved').length
  const riskLevel = Math.max(15, 100 - activeIncidents * 7)
  const overallScore = Math.round(
    roadAccessibility * 0.3 + vehicleAvailability * 0.25 + deliveryReliability * 0.25 + riskLevel * 0.2
  )

  return {
    overallScore,
    roadAccessibility,
    vehicleAvailability,
    deliveryReliability,
    riskLevel,
    supplyReadiness: 94,
  }
}

/**
 * Runs a comprehensive Disaster Simulation and calculates before/after impacts.
 */
export function executeDisasterSimulation(
  params: DisasterSimulationParams,
  roads: Road[],
  vehicles: Vehicle[],
  deliveries: Delivery[]
): DisasterSimulationResult {
  const safeBefore = roads.filter((r) => r.status === 'accessible').length
  const highRiskBefore = roads.filter((r) => r.status === 'orange' || r.status === 'yellow').length
  const blockedBefore = roads.filter((r) => r.status === 'blocked').length

  // Calculate new blocked roads and high-risk roads
  const rainSeverity = { Normal: 0, Moderate: 1, Heavy: 2, Extreme: 4 }[params.rainfall]
  const floodImpact = Math.round(params.floodLevelM * 1.5)

  const newlyBlockedCount = Math.max(1, (params.blockedRoadId ? 1 : 0) + (params.landslideProbability > 75 ? 2 : 0) + (floodImpact > 3 ? 1 : 0))
  const newBlocked = Math.min(roads.length - 1, blockedBefore + newlyBlockedCount)
  const newHighRisk = Math.min(roads.length - newBlocked, highRiskBefore + rainSeverity + 1)
  const newSafe = Math.max(0, roads.length - newBlocked - newHighRisk)

  const affectedVehicles = Math.min(vehicles.length, 3 + rainSeverity * 2 + floodImpact)
  const affectedDeliveries = Math.min(deliveries.length, 2 + rainSeverity * 2 + floodImpact)
  const affectedDistricts = Math.min(8, 2 + rainSeverity + (params.landslideProbability > 60 ? 2 : 1))

  return {
    before: {
      safeRoutes: safeBefore,
      highRisk: highRiskBefore,
      blocked: blockedBefore,
    },
    after: {
      safeRoutes: newSafe,
      highRisk: newHighRisk,
      blocked: newBlocked,
      affectedVehicles,
      affectedDeliveries,
      affectedDistricts,
      alternateRoutesFound: affectedVehicles,
      averageDelayMin: 35 + rainSeverity * 15 + floodImpact * 10,
    },
    appliedAt: new Date().toLocaleTimeString(),
  }
}
