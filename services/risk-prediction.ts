import { haversineKm } from '@/lib/geo'
import type { GeoPoint, Incident, RiskLevel, RouteCandidate, WeatherData } from '@/types'

export function riskFromScore(score: number): RiskLevel {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

export function accessibilityFromRisk(risk: RiskLevel): RouteCandidate['accessibility'] {
  if (risk === 'critical') return 'blocked'
  if (risk === 'high') return 'high_risk'
  if (risk === 'medium') return 'partially_accessible'
  return 'accessible'
}

export function predictRouteDisruption(input: {
  rainfallMm: number
  terrainRisk: RiskLevel
  nearbyIncidents: Incident[]
  trafficLevel: 'low' | 'medium' | 'high'
}): { score: number; level: RiskLevel; prediction: string; isDemo: true } {
  const rain = Math.min(40, input.rainfallMm / 4)
  const terrain = { low: 8, medium: 18, high: 32, critical: 42 }[input.terrainRisk]
  const incident = Math.min(30, input.nearbyIncidents.filter((item) => item.status !== 'resolved').length * 8)
  const traffic = { low: 4, medium: 12, high: 22 }[input.trafficLevel]
  const score = Math.min(99, Math.round(rain + terrain + incident + traffic))
  const level = riskFromScore(score)
  const prediction = score >= 70
    ? 'Possible flood or landslide disruption on this corridor.'
    : score >= 40
      ? 'Weather and incidents may slow this corridor.'
      : 'Corridor currently stable with routine caution.'
  return { score, level, prediction, isDemo: true }
}

export function scoreGoogleRoutes(
  result: google.maps.DirectionsResult,
  incidents: Incident[],
  weather: WeatherData | null,
  blocked = false,
): RouteCandidate[] {
  const routes = result.routes.map((route, index) => {
    const leg = route.legs[0]
    const distanceKm = (leg?.distance?.value ?? 0) / 1000
    const durationMin = (leg?.duration_in_traffic?.value ?? leg?.duration?.value ?? 0) / 60
    const path = route.overview_path?.map((point) => ({ lat: point.lat(), lng: point.lng() })) ?? []
    const nearby = incidents.filter((incident) => path.some((point) => haversineKm(point, { lat: incident.lat, lng: incident.lng }) < 12))
    const trafficLevel: RouteCandidate['trafficLevel'] = durationMin > distanceKm * 1.8 ? 'high' : durationMin > distanceKm * 1.2 ? 'medium' : 'low'
    const disruption = predictRouteDisruption({
      rainfallMm: weather?.rainfallMm ?? 18,
      terrainRisk: nearby.some((item) => item.type === 'landslide') ? 'high' : 'medium',
      nearbyIncidents: nearby,
      trafficLevel,
    })
    const distanceScore = Math.max(0, 40 - distanceKm / 20)
    const durationScore = Math.max(0, 30 - durationMin / 25)
    const riskPenalty = disruption.score * 0.35
    const score = Math.max(8, Math.min(99, Math.round(distanceScore + durationScore + 40 - riskPenalty)))
    const riskLevel = blocked && index === 0 ? 'critical' : disruption.level
    const accessibility = blocked && index === 0 ? 'blocked' : accessibilityFromRisk(riskLevel)
    return {
      id: `g-route-${index}`,
      distance: Math.round(distanceKm),
      estimatedTime: Math.round(durationMin),
      durationInTrafficMin: Math.round((leg?.duration_in_traffic?.value ?? 0) / 60),
      riskLevel,
      trafficLevel,
      score: blocked && index === 0 ? Math.min(score, 40) : score,
      reason: disruption.prediction,
      isRecommended: false,
      accessibility,
      path,
      summary: route.summary || `Route ${index + 1}`,
      isDemoScore: true,
    } satisfies RouteCandidate
  })

  const ranked = [...routes].sort((a, b) => {
    if (a.accessibility === 'blocked') return 1
    if (b.accessibility === 'blocked') return -1
    return b.score - a.score
  })
  const bestId = ranked.find((route) => route.accessibility !== 'blocked')?.id
  return routes.map((route) => ({
    ...route,
    isRecommended: route.id === bestId,
    reason: route.id === bestId
      ? 'Recommended because it has lower disruption risk and better accessibility. AI/ML-ready prototype scoring.'
      : route.reason,
  }))
}

export function nearestIncidentImpact(point: GeoPoint, incidents: Incident[]): number {
  return incidents.reduce((max, incident) => {
    const distance = haversineKm(point, { lat: incident.lat, lng: incident.lng })
    if (distance > 15) return max
    const weight = incident.severity === 'critical' ? 40 : incident.severity === 'high' ? 28 : 12
    return Math.max(max, weight - distance)
  }, 0)
}
