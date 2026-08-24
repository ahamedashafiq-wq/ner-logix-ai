'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { alerts as alertSeed, deliveries as deliverySeed, incidents as incidentSeed, logisticsHealth as healthSeed, roads, supplies, vehicles as vehicleSeed } from '@/mock/data'
import { computeHealth, computeKpis } from '@/services/logistics'
import { markReportsSyncedLocally, queueFieldReport } from '@/services/offline'
import { stepSimulatedVehicles } from '@/services/vehicles'
import type { Alert, Delivery, FieldReport, Incident, Vehicle } from '@/types'

function cloneVehicles(): Vehicle[] {
  return vehicleSeed.map((vehicle) => ({ ...vehicle, currentLocation: { ...vehicle.currentLocation } }))
}

export function useLogistics() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(cloneVehicles)
  const [incidents, setIncidents] = useState<Incident[]>(() => incidentSeed.map((item) => ({ ...item })))
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => deliverySeed.map((item) => ({ ...item })))
  const [alerts, setAlerts] = useState<Alert[]>(() => alertSeed.map((item) => ({ ...item })))
  const [simulation, setSimulation] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const [demoMode, setDemoMode] = useState(true)
  const [online, setOnline] = useState(true)
  const [syncState, setSyncState] = useState<'online' | 'offline' | 'syncing' | 'synced'>('online')
  const [primaryBlocked, setPrimaryBlocked] = useState(false)

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEffect(() => {
    if (!simulation) return
    const timer = window.setInterval(() => {
      setVehicles((current) => stepSimulatedVehicles(current))
    }, 2500)
    return () => window.clearInterval(timer)
  }, [simulation])

  useEffect(() => {
    if (!online) {
      setSyncState('offline')
      return
    }
    setSyncState('syncing')
    const timer = window.setTimeout(() => {
      void markReportsSyncedLocally().then(() => setSyncState('synced'))
    }, 600)
    return () => window.clearTimeout(timer)
  }, [online])

  const health = useMemo(() => computeHealth(vehicles, deliveries, incidents, roads), [deliveries, incidents, vehicles])
  const kpis = useMemo(
    () => computeKpis({ vehicles, deliveries, incidents, alerts, roads, supplies, health }),
    [alerts, deliveries, health, incidents, vehicles],
  )

  const addIncident = useCallback(async (incident: Incident, report?: FieldReport) => {
    setIncidents((current) => [incident, ...current])
    setPrimaryBlocked(incident.type === 'landslide' || incident.type === 'flood' || incident.type === 'road_blocked')
    setAlerts((current) => [{
      id: `a-${incident.id}`,
      type: incident.type === 'landslide' ? 'landslide_risk' : incident.type === 'flood' ? 'flood_risk' : 'road_blocked',
      severity: incident.severity === 'critical' ? 'critical' : 'high',
      title: `${incident.type.replace('_', ' ')} reported`,
      message: `${incident.type.replace('_', ' ')} reported near ${incident.location}`,
      location: incident.location,
      description: incident.description,
      recommendedAction: 'Use alternate route.',
      timestamp: 'Just now',
      resolved: false,
      affectedVehicles: incident.affectedVehicles,
    }, ...current])
    setDeliveries((current) => current.map((delivery) => (
      delivery.priority === 'critical' || delivery.vehicleId && incident.affectedVehicles.includes(delivery.vehicleId)
        ? { ...delivery, status: 'at_risk', riskLevel: 'high' }
        : delivery
    )))
    setVehicles((current) => current.map((vehicle) => (
      incident.affectedVehicles.includes(vehicle.id)
        ? { ...vehicle, status: 'delayed', riskLevel: 'high' }
        : vehicle
    )))
    if (report) await queueFieldReport(report)
  }, [])

  const runDemoScenario = useCallback(() => {
    const incident: Incident = {
      id: `INC-DEMO-${Date.now()}`,
      type: 'landslide',
      severity: 'high',
      status: 'active',
      location: 'NH-27 · Tamenglong approach',
      lat: 25.02,
      lng: 93.48,
      timestamp: 'Just now',
      description: 'Demo field report: slope failure after heavy rain. Corridor marked high risk.',
      reportedBy: 'Field Unit 07',
      affectedRoads: ['NH-27', 'NH-14'],
      affectedVehicles: ['v1'],
      confidence: 91,
    }
    void addIncident(incident)
    setSimulation(true)
    setVehicles((current) => current.map((vehicle, index) => index === 0
      ? { ...vehicle, vehicleNumber: 'NER-MED-001', cargo: 'Emergency Medicines', origin: 'Guwahati', destination: 'Imphal', status: 'delayed', riskLevel: 'high', isDemoGps: true }
      : vehicle))
  }, [addIncident])

  return {
    vehicles,
    incidents,
    deliveries,
    alerts,
    kpis,
    health: { ...healthSeed, ...health },
    simulation,
    setSimulation,
    emergency,
    setEmergency,
    demoMode,
    setDemoMode,
    online,
    syncState,
    primaryBlocked,
    addIncident,
    runDemoScenario,
  }
}
