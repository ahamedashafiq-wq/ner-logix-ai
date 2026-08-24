import type { Alert, Delivery, District, Incident, KpiItem, LogisticsHealth, Road, Supply, Vehicle } from '@/types'

export function computeKpis(input: {
  vehicles: Vehicle[]
  deliveries: Delivery[]
  incidents: Incident[]
  alerts: Alert[]
  roads: Road[]
  supplies: Supply[]
  health: LogisticsHealth
}): KpiItem[] {
  const activeVehicles = input.vehicles.filter((vehicle) => vehicle.status !== 'offline' && vehicle.status !== 'maintenance').length
  const delayed = input.deliveries.filter((delivery) => delivery.status === 'delayed' || delivery.status === 'at_risk' || delivery.status === 'blocked').length
  const activeIncidents = input.incidents.filter((incident) => incident.status !== 'resolved').length
  const accessible = input.roads.length
    ? Math.round((input.roads.filter((road) => road.status !== 'blocked').length / input.roads.length) * 100)
    : input.health.roadAccessibility
  const criticalAlerts = input.alerts.filter((alert) => !alert.resolved && (alert.severity === 'critical' || alert.severity === 'high')).length
  const supplyScore = input.supplies.length
    ? Math.round(input.supplies.reduce((sum, item) => sum + Math.min(100, (item.stock / item.minimumThreshold) * 50), 0) / input.supplies.length)
    : input.health.supplyReadiness

  return [
    { label: 'Active vehicles', value: String(activeVehicles), trend: '+12.4%', icon: 'truck' },
    { label: 'Deliveries today', value: String(input.deliveries.length), trend: '+8.2%', icon: 'package' },
    { label: 'Active incidents', value: String(activeIncidents), trend: '-3.1%', icon: 'triangle' },
    { label: 'Accessible roads', value: `${accessible}%`, trend: '+2.6%', icon: 'route' },
    { label: 'Critical alerts', value: String(criticalAlerts), trend: '+2', icon: 'bell' },
    { label: 'Delayed deliveries', value: String(delayed), trend: '-18.7%', icon: 'clock' },
    { label: 'Essential supply', value: `${Math.min(100, supplyScore)}%`, trend: '-4.3%', icon: 'boxes' },
    { label: 'Logistics health', value: `${input.health.overallScore}%`, trend: '+5.1%', icon: 'activity' },
  ]
}

export function computeBottlenecks(districts: District[]): { name: string; score: number; level: string }[] {
  return [...districts]
    .map((district) => {
      const score = Math.round(
        (100 - (district.accessibilityScore ?? 70)) * 0.4
          + (district.activeIncidents ?? 0) * 8
          + (district.delayedDeliveries ?? 0) * 6
          + ({ low: 4, medium: 12, high: 22, critical: 30 }[district.weatherRisk ?? 'low']),
      )
      return {
        name: `${district.name} corridor`,
        score,
        level: score >= 55 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export function computeHealth(vehicles: Vehicle[], deliveries: Delivery[], incidents: Incident[], roads: Road[]): LogisticsHealth {
  const active = vehicles.filter((vehicle) => vehicle.status !== 'offline').length
  const delayed = deliveries.filter((delivery) => delivery.status === 'delayed' || delivery.status === 'at_risk').length
  const openRoads = roads.filter((road) => road.status !== 'blocked').length
  const roadAccessibility = roads.length ? Math.round((openRoads / roads.length) * 100) : 88
  const vehicleAvailability = vehicles.length ? Math.round((active / vehicles.length) * 100) : 90
  const deliveryReliability = deliveries.length ? Math.round(((deliveries.length - delayed) / deliveries.length) * 100) : 90
  const riskLevel = Math.max(20, 100 - incidents.filter((incident) => incident.status !== 'resolved').length * 8)
  const overallScore = Math.round((roadAccessibility + vehicleAvailability + deliveryReliability + riskLevel) / 4)
  return { overallScore, roadAccessibility, vehicleAvailability, deliveryReliability, riskLevel, supplyReadiness: 90 }
}
