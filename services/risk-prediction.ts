import { haversineKm } from '@/lib/geo'
import type { GeoPoint, Incident, RiskLevel, RiskScoreBreakdown, Road, RouteCandidate, WeatherData } from '@/types'

export function riskFromScore(score: number): RiskLevel {
  if (score >= 81) return 'critical'
  if (score >= 61) return 'high'
  if (score >= 31) return 'medium'
  return 'low'
}

export function accessibilityFromRisk(risk: RiskLevel): RouteCandidate['accessibility'] {
  if (risk === 'critical') return 'blocked'
  if (risk === 'high') return 'high_risk'
  if (risk === 'medium') return 'partially_accessible'
  return 'accessible'
}

export interface RiskCalculationInput {
  rainfallMm?: number
  temperatureC?: number
  humidity?: number
  riverLevelAlert?: boolean
  roadCondition?: 'Good' | 'Fair' | 'Poor' | 'Severely Damaged'
  terrainSlopeDeg?: number
  elevationM?: number
  historicalIncidents?: number
  trafficDensity?: 'low' | 'medium' | 'heavy' | 'extreme'
  previousLandslide?: boolean
  previousFlood?: boolean
  nearbyIncidents?: Incident[]
}

/**
 * Transparent AI Risk Prediction Engine for NER terrain.
 * Analyzes multi-factor meteorological, geomorphological, and traffic inputs.
 */
export function calculateDetailedRisk(input: RiskCalculationInput): RiskScoreBreakdown {
  const rainfall = input.rainfallMm ?? 20
  const slope = input.terrainSlopeDeg ?? 25
  const condition = input.roadCondition ?? 'Fair'
  const traffic = input.trafficDensity ?? 'medium'
  const history = input.historicalIncidents ?? 1
  const nearbyActive = (input.nearbyIncidents ?? []).filter((i) => i.status !== 'resolved')

  const factors: string[] = []

  // 1. Landslide Risk Component (0 - 100)
  // Rain + Slope + Saturated Terrain + Previous Landslide
  let rainFactor = Math.min(45, (rainfall / 100) * 45)
  let slopeFactor = Math.min(30, (slope / 45) * 30)
  let historyBonus = input.previousLandslide ? 15 : Math.min(12, history * 4)
  if (nearbyActive.some((i) => i.type === 'landslide')) {
    historyBonus += 15
    factors.push('Active landslide reported in corridor')
  }
  const landslideRisk = Math.min(99, Math.round(rainFactor + slopeFactor + historyBonus))

  if (rainfall >= 60) factors.push(`Heavy rainfall (${rainfall} mm)`)
  if (slope >= 30) factors.push(`Steep terrain gradient (${slope}°)`)
  if (input.previousLandslide) factors.push('Historical landslide vulnerability zone')

  // 2. Flood Risk Component (0 - 100)
  let floodBase = Math.min(40, (rainfall / 90) * 40)
  if (input.riverLevelAlert) {
    floodBase += 35
    factors.push('River stage warning on approach')
  }
  if (input.previousFlood) floodBase += 15
  if (nearbyActive.some((i) => i.type === 'flood')) {
    floodBase += 20
    factors.push('Active flood water on carriageway')
  }
  const floodRisk = Math.min(99, Math.round(floodBase))

  // 3. Traffic Disruption Risk (0 - 100)
  const trafficMap = { low: 10, medium: 30, heavy: 65, extreme: 90 }
  let trafficRisk = trafficMap[traffic]
  if (traffic === 'heavy' || traffic === 'extreme') {
    factors.push(`${traffic.toUpperCase()} convoy/civilian traffic density`)
  }

  // 4. Road Damage Risk (0 - 100)
  const conditionMap = { Good: 10, Fair: 35, Poor: 68, 'Severely Damaged': 95 }
  let roadDamageRisk = conditionMap[condition]
  if (condition === 'Poor' || condition === 'Severely Damaged') {
    factors.push(`Pavement status: ${condition}`)
  }

  // Weighted overall composite risk score (0 - 100)
  const composite = Math.round(
    landslideRisk * 0.38 +
    floodRisk * 0.24 +
    roadDamageRisk * 0.22 +
    trafficRisk * 0.16
  )

  const overallRisk = Math.min(99, Math.max(5, composite))
  const riskLevel = riskFromScore(overallRisk)

  let predictionText = 'Corridor currently stable with routine operational caution.'
  if (overallRisk >= 81) {
    predictionText = 'CRITICAL: Extreme disruption likely. High probability of blockage from slope failure or flooding.'
  } else if (overallRisk >= 61) {
    predictionText = 'HIGH RISK: Significant travel delays expected. Vulnerable to landslide slips and road deformation.'
  } else if (overallRisk >= 31) {
    predictionText = 'MODERATE RISK: Weather and terrain caution required. Monitor convoy speeds.'
  }

  return {
    overallRisk,
    riskLevel,
    landslideRisk,
    floodRisk,
    trafficRisk,
    roadDamageRisk,
    factors: factors.length ? factors : ['Routine mountain terrain parameters'],
    confidence: 91 + (rainfall > 50 ? 5 : 0),
    predictionText,
  }
}

export function predictRouteDisruption(input: {
  rainfallMm: number
  terrainRisk: RiskLevel
  nearbyIncidents: Incident[]
  trafficLevel: 'low' | 'medium' | 'high'
}): { score: number; level: RiskLevel; prediction: string; isDemo: true; breakdown: RiskScoreBreakdown } {
  const breakdown = calculateDetailedRisk({
    rainfallMm: input.rainfallMm,
    terrainSlopeDeg: input.terrainRisk === 'critical' ? 40 : input.terrainRisk === 'high' ? 32 : 20,
    nearbyIncidents: input.nearbyIncidents,
    trafficDensity: input.trafficLevel === 'high' ? 'heavy' : input.trafficLevel === 'medium' ? 'medium' : 'low',
    previousLandslide: input.nearbyIncidents.some((i) => i.type === 'landslide'),
    previousFlood: input.nearbyIncidents.some((i) => i.type === 'flood'),
  })

  return {
    score: breakdown.overallRisk,
    level: breakdown.riskLevel,
    prediction: breakdown.predictionText,
    isDemo: true,
    breakdown,
  }
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
    const nearby = incidents.filter((incident) =>
      path.some((point) => haversineKm(point, { lat: incident.lat, lng: incident.lng }) < 15)
    )
    const trafficLevel: RouteCandidate['trafficLevel'] =
      durationMin > distanceKm * 1.8 ? 'high' : durationMin > distanceKm * 1.2 ? 'medium' : 'low'

    const disruption = predictRouteDisruption({
      rainfallMm: weather?.rainfallMm ?? 45,
      terrainRisk: nearby.some((item) => item.type === 'landslide' || item.severity === 'critical') ? 'high' : 'medium',
      nearbyIncidents: nearby,
      trafficLevel,
    })

    const distanceScore = Math.max(0, 40 - distanceKm / 20)
    const durationScore = Math.max(0, 30 - durationMin / 25)
    const riskPenalty = disruption.score * 0.4
    const score = Math.max(8, Math.min(99, Math.round(distanceScore + durationScore + 40 - riskPenalty)))
    const isPrimary = index === 0
    const riskLevel = blocked && isPrimary ? 'critical' : disruption.level
    const accessibility = blocked && isPrimary ? 'blocked' : accessibilityFromRisk(riskLevel)

    return {
      id: `g-route-${index}`,
      name: isPrimary ? 'Route A (Primary Corridor)' : index === 1 ? 'Route B (Alternate Valley Route)' : `Route ${String.fromCharCode(65 + index)}`,
      distance: Math.round(distanceKm),
      estimatedTime: Math.round(durationMin),
      durationInTrafficMin: Math.round((leg?.duration_in_traffic?.value ?? 0) / 60),
      riskLevel,
      trafficLevel,
      score: blocked && isPrimary ? 25 : score,
      reason: disruption.prediction,
      isRecommended: false,
      accessibility,
      path,
      summary: route.summary || `Route ${index + 1}`,
      isDemoScore: true,
      riskReduction: isPrimary ? 0 : 65,
      additionalDistanceKm: isPrimary ? 0 : Math.round(distanceKm * 0.1),
      additionalTimeMin: isPrimary ? 0 : Math.round(durationMin * 0.12),
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
      ? 'Recommended: Best balance of accessibility, lower disaster probability, and travel time.'
      : route.reason,
  }))
}

export function nearestIncidentImpact(point: GeoPoint, incidents: Incident[]): number {
  return incidents.reduce((max, incident) => {
    const distance = haversineKm(point, { lat: incident.lat, lng: incident.lng })
    if (distance > 20) return max
    const weight = incident.severity === 'critical' ? 45 : incident.severity === 'high' ? 30 : 15
    return Math.max(max, weight - distance)
  }, 0)
}
