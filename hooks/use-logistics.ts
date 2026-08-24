'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  alerts as alertSeed,
  deliveries as deliverySeed,
  demoScenarioTimeline as scenarioSeed,
  districts as districtSeed,
  hospitals as hospitalSeed,
  incidents as incidentSeed,
  logisticsHealth as healthSeed,
  roads as roadSeed,
  supplies as supplySeed,
  vehicles as vehicleSeed,
  warehouses as warehouseSeed,
  weatherSeed,
} from '@/mock/data'
import { type AppLanguage } from '@/lib/i18n'
import {
  computeDistrictConnectivity,
  computeHealth,
  computeKpis,
  executeDisasterSimulation,
} from '@/services/logistics'
import {
  getPendingReportCount,
  listQueuedReports,
  markReportsSyncedLocally,
  queueFieldReport,
} from '@/services/offline'
import { calculateRiskAwareRouteCandidates } from '@/services/routes'
import { stepSimulatedVehicles } from '@/services/vehicles'
import type {
  Alert,
  Delivery,
  DisasterSimulationParams,
  DisasterSimulationResult,
  District,
  FieldReport,
  Hospital,
  Incident,
  Road,
  RouteCandidate,
  ScenarioTimelineEvent,
  Supply,
  Vehicle,
  Warehouse,
  WeatherData,
} from '@/types'

function cloneVehicles(): Vehicle[] {
  return vehicleSeed.map((v) => ({ ...v, currentLocation: { ...v.currentLocation } }))
}

export function useLogistics() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(cloneVehicles)
  const [incidents, setIncidents] = useState<Incident[]>(() => incidentSeed.map((item) => ({ ...item })))
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => deliverySeed.map((item) => ({ ...item })))
  const [alerts, setAlerts] = useState<Alert[]>(() => alertSeed.map((item) => ({ ...item })))
  const [roads, setRoads] = useState<Road[]>(() => roadSeed.map((item) => ({ ...item })))
  const [supplies, setSupplies] = useState<Supply[]>(() => supplySeed.map((item) => ({ ...item })))
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => warehouseSeed.map((item) => ({ ...item })))
  const [hospitals, setHospitals] = useState<Hospital[]>(() => hospitalSeed.map((item) => ({ ...item })))
  const [weatherList, setWeatherList] = useState<WeatherData[]>(() => weatherSeed.map((item) => ({ ...item })))

  const [simulation, setSimulation] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const [demoMode, setDemoMode] = useState(true)
  const [language, setLanguage] = useState<AppLanguage>('en')
  const [online, setOnline] = useState(true)
  const [syncState, setSyncState] = useState<'online' | 'offline' | 'syncing' | 'synced'>('online')
  const [pendingReportsCount, setPendingReportsCount] = useState(0)
  const [primaryBlocked, setPrimaryBlocked] = useState(false)
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<RouteCandidate | null>(null)

  // Demo Scenario State (Medicine Delivery Emergency)
  const [scenarioActive, setScenarioActive] = useState(false)
  const [scenarioTimeline, setScenarioTimeline] = useState<ScenarioTimelineEvent[]>(scenarioSeed)
  const [scenarioStep, setScenarioStep] = useState(0)

  // Disaster Simulator State
  const [lastSimulationResult, setLastSimulationResult] = useState<DisasterSimulationResult | null>(null)

  // Health & connection status tracking
  const [healthStatus, setHealthStatus] = useState<{
    api: 'CONNECTED' | 'DEGRADED' | 'OFFLINE'
    database: string
    weather: 'LIVE' | 'DEGRADED' | 'OFFLINE'
    lastWeatherSync: string
    ws: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'DEGRADED'
    gps: 'LIVE' | 'DEMO'
    lastUpdatedSecondsAgo: number
  }>({
    api: 'CONNECTED',
    database: 'POSTGIS OK',
    weather: 'LIVE',
    lastWeatherSync: 'Just now',
    ws: 'CONNECTED',
    gps: 'DEMO',
    lastUpdatedSecondsAgo: 0,
  })

  // Network & Online status listener
  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateOnline = () => {
      const isOnline = navigator.onLine
      setOnline(isOnline)
      if (!isOnline) {
        setSyncState('offline')
        setHealthStatus((prev) => ({ ...prev, api: 'OFFLINE', ws: 'OFFLINE' }))
      } else {
        setSyncState('syncing')
        void markReportsSyncedLocally().then(() => {
          setSyncState('synced')
          setPendingReportsCount(0)
        })
      }
    }

    setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    void getPendingReportCount().then(setPendingReportsCount)

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  // Seconds counter for UI health indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setHealthStatus((prev) => ({
        ...prev,
        lastUpdatedSecondsAgo: (prev.lastUpdatedSecondsAgo + 1) % 60,
        gps: demoMode ? 'DEMO' : 'LIVE',
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [demoMode])

  // Live Simulated GPS motion loop (every 3 seconds in demo mode)
  useEffect(() => {
    if (!demoMode && !simulation) return
    const timer = window.setInterval(() => {
      setVehicles((current) => stepSimulatedVehicles(current))
    }, 3000)
    return () => window.clearInterval(timer)
  }, [demoMode, simulation])

  // Live Backend Data Fetching in LIVE mode
  useEffect(() => {
    if (demoMode) return
    let active = true

    const fetchLiveState = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
        const [roadsRes, vehRes, incRes, weatherRes, alertsRes] = await Promise.allSettled([
          fetch(`${backendUrl}/api/roads`),
          fetch(`${backendUrl}/api/vehicles`),
          fetch(`${backendUrl}/api/incidents`),
          fetch(`${backendUrl}/api/weather`),
          fetch(`${backendUrl}/api/alerts`),
        ])

        if (!active) return

        if (roadsRes.status === 'fulfilled' && roadsRes.value.ok) {
          const rData = await roadsRes.value.json()
          if (Array.isArray(rData)) setRoads(rData)
        }
        if (vehRes.status === 'fulfilled' && vehRes.value.ok) {
          const vData = await vehRes.value.json()
          if (Array.isArray(vData)) setVehicles(vData)
        }
        if (incRes.status === 'fulfilled' && incRes.value.ok) {
          const iData = await incRes.value.json()
          if (Array.isArray(iData)) setIncidents(iData)
        }
        if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
          const wData = await weatherRes.value.json()
          if (Array.isArray(wData)) setWeatherList(wData)
        }
        if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
          const aData = await alertsRes.value.json()
          if (Array.isArray(aData)) setAlerts(aData)
        }

        setHealthStatus((prev) => ({
          ...prev,
          api: 'CONNECTED',
          database: 'POSTGIS OK',
          weather: 'LIVE',
          lastUpdatedSecondsAgo: 0,
        }))
      } catch {
        if (!active) return
        setHealthStatus((prev) => ({
          ...prev,
          api: 'DEGRADED',
          weather: 'DEGRADED',
        }))
      }
    }

    void fetchLiveState()
    const interval = setInterval(fetchLiveState, 15000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [demoMode])

  // Live WebSocket Connection (Vehicles, Alerts, Incidents)
  useEffect(() => {
    if (typeof window === 'undefined') return
    let wsVehicles: WebSocket | null = null
    let wsAlerts: WebSocket | null = null
    let wsIncidents: WebSocket | null = null
    let reconnectTimeout: any = null

    const connectWebSockets = () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

        // 1. Vehicle Telemetry Channel
        wsVehicles = new WebSocket(`${wsUrl}/ws/vehicles`)
        wsVehicles.onopen = () => {
          setHealthStatus((prev) => ({ ...prev, ws: 'CONNECTED' }))
        }
        wsVehicles.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (Array.isArray(data)) {
              setVehicles((prev) =>
                prev.map((v) => {
                  const update = data.find((u: any) => u.id === v.id || u.vehicleNumber === v.vehicleNumber)
                  if (update) {
                    return {
                      ...v,
                      currentLocation: update.currentLocation || v.currentLocation,
                      speed: update.speed ?? v.speed,
                      status: update.status ?? v.status,
                      fuel: update.fuel ?? v.fuel,
                      battery: update.battery ?? v.battery,
                      eta: update.eta ?? v.eta,
                      isDemoGps: update.isDemoGps ?? v.isDemoGps,
                    }
                  }
                  return v
                })
              )
            } else if (data && data.vehicleId) {
              setVehicles((prev) =>
                prev.map((v) =>
                  v.id === data.vehicleId || v.vehicleNumber === data.vehicleId
                    ? {
                        ...v,
                        currentLocation: data.currentLocation || v.currentLocation,
                        speed: data.speed ?? v.speed,
                        status: data.status ?? v.status,
                        isDemoGps: data.isDemoGps ?? false,
                      }
                    : v
                )
              )
            }
          } catch {}
        }

        // 2. Alerts Channel
        wsAlerts = new WebSocket(`${wsUrl}/ws/alerts`)
        wsAlerts.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'ALERT_CREATED') {
              setAlerts((prev) => [data, ...prev])
              if (data.updatedRoads && Array.isArray(data.updatedRoads)) {
                setRoads((currentRoads) =>
                  currentRoads.map((r) => {
                    const match = data.updatedRoads.find((ur: any) => ur.name === r.name || ur.id === r.id)
                    return match ? { ...r, status: match.status, riskLevel: match.riskLevel } : r
                  })
                )
              }
            } else if (data.type === 'WEATHER_UPDATED') {
              setHealthStatus((prev) => ({ ...prev, weather: 'LIVE', lastWeatherSync: 'Just now' }))
            }
          } catch {}
        }

        // 3. Incidents Channel
        wsIncidents = new WebSocket(`${wsUrl}/ws/incidents`)
        wsIncidents.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.id && data.location) {
              setIncidents((prev) => [data, ...prev.filter((i) => i.id !== data.id)])
            }
          } catch {}
        }

        const handleClose = () => {
          setHealthStatus((prev) => ({ ...prev, ws: 'RECONNECTING' }))
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(connectWebSockets, 5000)
          }
        }

        wsVehicles.onclose = handleClose
        wsAlerts.onclose = handleClose
        wsIncidents.onclose = handleClose
      } catch {
        setHealthStatus((prev) => ({ ...prev, ws: 'DEGRADED' }))
      }
    }

    connectWebSockets()
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (wsVehicles) wsVehicles.close()
      if (wsAlerts) wsAlerts.close()
      if (wsIncidents) wsIncidents.close()
    }
  }, [])

  // Dynamic District Connectivity calculations
  const districts = useMemo<District[]>(() => {
    return districtSeed.map((district) => {
      const weather = weatherList.find((w) => w.district.toLowerCase() === district.name.toLowerCase()) ?? null
      const { score, status } = computeDistrictConnectivity(district, roads, weather, incidents)
      return {
        ...district,
        connectivityScore: score,
        connectivityStatus: status,
      }
    })
  }, [incidents, roads, weatherList])

  // Dynamic Health & KPIs
  const health = useMemo(
    () => computeHealth(vehicles, deliveries, incidents, roads),
    [deliveries, incidents, roads, vehicles]
  )

  const kpis = useMemo(
    () => computeKpis({ vehicles, deliveries, incidents, alerts, roads, supplies, districts, health }),
    [alerts, deliveries, districts, health, incidents, roads, supplies, vehicles]
  )

  /**
   * Central Intelligence Loop:
   * Adds an incident -> updates road status -> updates AI risk -> detects vehicles -> reroutes -> pushes alert -> updates KPIs
   */
  const addIncident = useCallback(
    async (incident: Incident, report?: FieldReport) => {
      setIncidents((current) => [incident, ...current])

      const isBlockade =
        incident.type === 'landslide' ||
        incident.type === 'flood' ||
        incident.type === 'road_blocked' ||
        incident.type === 'bridge_damage'

      if (isBlockade) {
        setPrimaryBlocked(true)
      }

      // 1. Update Road status
      setRoads((currentRoads) =>
        currentRoads.map((road) => {
          if (incident.affectedRoads.includes(road.name) || incident.location.includes(road.name)) {
            return {
              ...road,
              status: isBlockade ? 'blocked' : 'orange',
              riskLevel: isBlockade ? 'critical' : 'high',
              landslideProb: incident.type === 'landslide' ? 94 : road.landslideProb,
              floodRisk: incident.type === 'flood' ? 88 : road.floodRisk,
              overallRisk: isBlockade ? 92 : 78,
              delayMin: (road.delayMin ?? 0) + (isBlockade ? 60 : 30),
              affectedVehicles: Array.from(new Set([...road.affectedVehicles, ...incident.affectedVehicles])),
            }
          }
          return road
        })
      )

      // 2. Identify and update affected vehicles & deliveries
      setVehicles((currentVehicles) =>
        currentVehicles.map((vehicle) => {
          if (incident.affectedVehicles.includes(vehicle.id) || incident.affectedVehicles.includes(vehicle.vehicleNumber)) {
            return {
              ...vehicle,
              status: 'delayed',
              riskLevel: 'high',
              eta: '7h 45m (+42m delay)',
            }
          }
          return vehicle
        })
      )

      setDeliveries((currentDeliveries) =>
        currentDeliveries.map((delivery) => {
          if (
            (delivery.vehicleId && incident.affectedVehicles.includes(delivery.vehicleId)) ||
            (incident.affectedVehicles.length > 0 && delivery.priority === 'critical')
          ) {
            return {
              ...delivery,
              status: isBlockade ? 'at_risk' : 'delayed',
              riskLevel: isBlockade ? 'critical' : 'high',
              delayMinutes: (delivery.delayMinutes ?? 0) + 42,
            }
          }
          return delivery
        })
      )

      // 3. Generate Centralized Alert
      const alertType =
        incident.type === 'landslide'
          ? 'landslide_risk'
          : incident.type === 'flood'
          ? 'flood_risk'
          : 'road_blocked'

      const newAlert: Alert = {
        id: `a-${Date.now()}`,
        type: alertType,
        severity: incident.severity === 'critical' ? 'critical' : 'high',
        title: `${incident.type.replace('_', ' ').toUpperCase()} CONFIRMED`,
        message: `${incident.location} reported ${incident.type.replace('_', ' ')} (${incident.severity.toUpperCase()}).`,
        location: incident.location,
        description: incident.description,
        recommendedAction: 'Reroute via verified alternate corridor (Route B recommended).',
        affectedVehicles: incident.affectedVehicles,
        timestamp: 'Just now',
        resolved: false,
      }

      setAlerts((current) => [newAlert, ...current])

      // 4. Dispatch to backend REST API if online
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
          void fetch(`${backendUrl}/api/field-reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: incident.type,
              severity: incident.severity,
              location: incident.location,
              lat: incident.lat,
              lng: incident.lng,
              description: incident.description,
              reportedBy: incident.reportedBy || 'Field Officer',
              affectedRoads: incident.affectedRoads,
              affectedVehicles: incident.affectedVehicles,
              confidence: incident.confidence || 90,
              photoDataUrl: incident.photoDataUrl,
            }),
          })
        } catch {}
      }

      // 5. Handle Field Report Offline Caching
      if (report) {
        await queueFieldReport(report)
        if (!navigator.onLine) {
          setPendingReportsCount((prev) => prev + 1)
        }
      }
    },
    []
  )

  /**
   * Resets all state to clean initial defaults (for guaranteed demo resets)
   */
  const resetDemo = useCallback(() => {
    setVehicles(cloneVehicles())
    setIncidents(incidentSeed.map((item) => ({ ...item })))
    setDeliveries(deliverySeed.map((item) => ({ ...item })))
    setAlerts(alertSeed.map((item) => ({ ...item })))
    setRoads(roadSeed.map((item) => ({ ...item })))
    setSupplies(supplySeed.map((item) => ({ ...item })))
    setPrimaryBlocked(false)
    setEmergency(false)
    setSimulation(false)
    setScenarioActive(false)
    setScenarioStep(0)
  }, [])

  /**
   * Triggers the "Medicine Delivery Emergency" scenario end-to-end
   */
  const triggerMedicineScenario = useCallback(() => {
    setScenarioActive(true)
    setScenarioStep(1)

    // Stage 1: Dispatched vehicle
    setVehicles((current) =>
      current.map((v) =>
        v.id === 'v1'
          ? {
              ...v,
              vehicleNumber: 'NER-MED-204',
              cargo: 'Emergency Medicines & Blood Plasma',
              cargoPriority: 'critical',
              origin: 'Guwahati',
              destination: 'Aizawl',
              status: 'on_route',
              riskLevel: 'medium',
              isDemoGps: true,
            }
          : v
      )
    )

    // Trigger Landslide after short delay
    const demoIncident: Incident = {
      id: `INC-MED-DEMO`,
      type: 'landslide',
      severity: 'critical',
      status: 'active',
      location: 'NH-14 · Tamenglong Pass',
      lat: 24.98,
      lng: 93.62,
      timestamp: 'Just now',
      description: 'Major slope failure at km 142. Massive rockfall blocking both lanes. Emergency medicine convoy halted.',
      reportedBy: 'Field Officer T. Jamir (Unit 07)',
      affectedRoads: ['NH-14'],
      affectedVehicles: ['v1', 'v3', 'v5'],
      confidence: 96,
    }

    void addIncident(demoIncident)
    setSimulation(true)
    setEmergency(true)

    // Reroute vehicle to Route B after calculation
    window.setTimeout(() => {
      setVehicles((current) =>
        current.map((v) =>
          v.id === 'v1'
            ? {
                ...v,
                status: 'on_route',
                riskLevel: 'low',
                eta: '5h 54m',
                deliveryPercentage: 72,
              }
            : v
        )
      )
      setDeliveries((current) =>
        current.map((d) =>
          d.id === 'del1'
            ? {
                ...d,
                status: 'rerouted',
                riskLevel: 'low',
              }
            : d
        )
      )
    }, 1500)
  }, [addIncident])

  /**
   * Runs Disaster Simulation
   */
  const runSimulation = useCallback(
    (params: DisasterSimulationParams) => {
      const result = executeDisasterSimulation(params, roads, vehicles, deliveries)
      setLastSimulationResult(result)

      // Modify road states
      if (params.blockedRoadId) {
        setRoads((current) =>
          current.map((r) => (r.id === params.blockedRoadId ? { ...r, status: 'blocked', riskLevel: 'critical' } : r))
        )
      }
      return result
    },
    [deliveries, roads, vehicles]
  )

  /**
   * Manual offline sync trigger
   */
  const syncOfflineReports = useCallback(async () => {
    setSyncState('syncing')
    const synced = await markReportsSyncedLocally()
    setSyncState('synced')
    setPendingReportsCount(0)
    return synced
  }, [])

  return {
    vehicles,
    setVehicles,
    incidents,
    setIncidents,
    deliveries,
    setDeliveries,
    alerts,
    setAlerts,
    roads,
    setRoads,
    supplies,
    setSupplies,
    warehouses,
    setWarehouses,
    hospitals,
    setHospitals,
    districts,
    weatherList,
    kpis,
    health: { ...healthSeed, ...health },
    healthStatus,
    simulation,
    setSimulation,
    emergency,
    setEmergency,
    demoMode,
    setDemoMode,
    language,
    setLanguage,
    online,
    syncState,
    pendingReportsCount,
    primaryBlocked,
    setPrimaryBlocked,
    selectedRoad,
    setSelectedRoad,
    selectedCandidate,
    setSelectedCandidate,
    scenarioActive,
    scenarioTimeline,
    scenarioStep,
    lastSimulationResult,
    addIncident,
    resetDemo,
    triggerMedicineScenario,
    runSimulation,
    syncOfflineReports,
  }
}
