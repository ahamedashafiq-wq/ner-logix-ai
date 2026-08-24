'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import {
  Activity,
  AlertTriangle,
  Boxes,
  CloudRain,
  Crosshair,
  Hospital as HospitalIcon,
  Layers,
  Maximize2,
  Navigation,
  Route as RouteIcon,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  Warehouse as WarehouseIcon,
  X,
  Zap,
} from 'lucide-react'
import { NER_BOUNDS, NER_CENTER, NER_OVERVIEW_ZOOM, isValidPoint } from '@/lib/geo'
import { t, type AppLanguage } from '@/lib/i18n'
import { getGoogleMapsApiKey, GOOGLE_MAPS_LIBRARIES, hasGoogleMapsKey } from '@/services/google-maps'
import { geocodeInNer, requestDrivingRoutes } from '@/services/routes'
import { getWeather } from '@/services/weather'
import type {
  Delivery,
  District,
  GeoPoint,
  GpsFix,
  Hospital,
  Incident,
  MapLayerId,
  Road,
  RouteCandidate,
  Vehicle,
  Warehouse,
  WeatherData,
} from '@/types'

type LayersState = Record<MapLayerId, boolean>

const defaultLayers: LayersState = {
  roads: true,
  traffic: true,
  vehicles: true,
  incidents: true,
  warehouses: true,
  hospitals: true,
  deliveries: true,
  risk: true,
  weather: true,
}

function TrafficLayerControl({ enabled }: { enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || !map || !window.google?.maps) return
    const layer = new window.google.maps.TrafficLayer()
    layer.setMap(map)
    return () => layer.setMap(null)
  }, [enabled, map])
  return null
}

function CameraSync({ target, zoom, fitNer }: { target: GeoPoint | null; zoom?: number; fitNer: number }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    if (fitNer) {
      map.fitBounds({
        north: NER_BOUNDS.north,
        south: NER_BOUNDS.south,
        east: NER_BOUNDS.east,
        west: NER_BOUNDS.west,
      })
      return
    }
    if (target && isValidPoint(target)) {
      map.panTo(target)
      if (zoom) map.setZoom(zoom)
    }
  }, [fitNer, map, target, zoom])
  return null
}

function GpsAccuracy({ fix }: { fix: GpsFix | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !fix || !window.google?.maps || !fix.accuracy) return
    const circle = new window.google.maps.Circle({
      map,
      center: { lat: fix.lat, lng: fix.lng },
      radius: Math.min(fix.accuracy, 400),
      fillColor: '#35c2d4',
      fillOpacity: 0.14,
      strokeColor: '#35c2d4',
      strokeWeight: 1,
    })
    return () => circle.setMap(null)
  }, [fix, map])
  return null
}

function RouteDrawers({
  origin,
  destination,
  incidents,
  weather,
  blocked,
  selectedId,
  onCandidates,
  onStatus,
}: {
  origin: GeoPoint | null
  destination: GeoPoint | null
  incidents: Incident[]
  weather: WeatherData | null
  blocked: boolean
  selectedId: string | null
  onCandidates: (routes: RouteCandidate[]) => void
  onStatus: (status: string) => void
}) {
  const map = useMap()
  const polylines = useRef<google.maps.Polyline[]>([])

  useEffect(() => {
    let cancelled = false
    const clear = () => {
      polylines.current.forEach((line) => line.setMap(null))
      polylines.current = []
    }
    if (!map || !origin || !destination || !window.google?.maps) {
      clear()
      onCandidates([])
      return
    }
    void requestDrivingRoutes(origin, destination, incidents, weather, blocked).then(
      ({ candidates, status }) => {
        if (cancelled) return
        clear()
        onStatus(status)
        onCandidates(candidates)
        polylines.current = candidates.map((candidate) => {
          const active = !selectedId || selectedId === candidate.id
          const path = candidate.path && candidate.path.length > 0 ? candidate.path : [origin, destination]
          const polyline = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: candidate.isRecommended
              ? '#35c2d4'
              : candidate.accessibility === 'blocked'
              ? '#e76561'
              : '#e9ad4b',
            strokeOpacity: active ? (candidate.isRecommended ? 0.95 : 0.6) : 0.25,
            strokeWeight: candidate.isRecommended ? 6 : 4,
            zIndex: candidate.isRecommended ? 10 : 5,
            map,
          })
          return polyline
        })
      }
    )
    return () => {
      cancelled = true
      clear()
    }
  }, [blocked, destination, incidents, map, onCandidates, onStatus, origin, selectedId, weather])

  return null
}

function MapButtons({
  traffic,
  onTraffic,
  onLocate,
  onNer,
  onFullscreen,
  onLayers,
}: {
  traffic: boolean
  onTraffic: () => void
  onLocate: () => void
  onNer: () => void
  onFullscreen: () => void
  onLayers: () => void
}) {
  const map = useMap()
  return (
    <div className="map-controls">
      <button type="button" aria-label="Zoom in" onClick={() => map?.setZoom((map.getZoom() ?? 7) + 1)}>+</button>
      <button type="button" aria-label="Zoom out" onClick={() => map?.setZoom((map.getZoom() ?? 7) - 1)}>−</button>
      <button type="button" aria-label="My location" title="My location" onClick={onLocate}><Crosshair size={15} /></button>
      <button type="button" aria-label="Traffic" title="Traffic" className={traffic ? 'active' : ''} onClick={onTraffic}><Activity size={14} /></button>
      <button type="button" aria-label="NER overview" title="NER overview" onClick={onNer}>NER</button>
      <button type="button" aria-label="Layers" title="Layers" onClick={onLayers}><Layers size={14} /></button>
      <button type="button" aria-label="Fullscreen" title="Fullscreen" onClick={onFullscreen}><Maximize2 size={14} /></button>
    </div>
  )
}

/**
 * Fallback interactive SVG / Canvas GIS renderer mapping NER coordinates (lat 21.95 - 29.45, lng 88.0 - 97.42)
 */
function FallbackGisMap({
  roads,
  vehicles,
  incidents,
  warehouses,
  hospitals,
  districts,
  layers,
  simulation,
  emergency,
  onVehicle,
  onIncident,
  onRoadSelect,
}: {
  roads: Road[]
  vehicles: Vehicle[]
  incidents: Incident[]
  warehouses: Warehouse[]
  hospitals: Hospital[]
  districts: District[]
  layers: LayersState
  simulation: boolean
  emergency: boolean
  onVehicle: (vehicle: Vehicle) => void
  onIncident: (incident: Incident) => void
  onRoadSelect: (road: Road) => void
}) {
  // Projection helper converting NER coordinates to percentage box (0% to 100%)
  const project = (point: GeoPoint) => {
    const x = ((point.lng - 88.0) / (97.42 - 88.0)) * 100
    const y = ((29.45 - point.lat) / (29.45 - 21.95)) * 100
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    }
  }

  // District lookup map for road lines
  const distCoords: Record<string, GeoPoint> = {}
  districts.forEach((d) => {
    distCoords[d.name.toLowerCase()] = { lat: d.lat, lng: d.lng }
  })
  distCoords['guwahati'] = { lat: 26.1445, lng: 91.7362 }
  distCoords['shillong'] = { lat: 25.5788, lng: 91.8933 }
  distCoords['imphal'] = { lat: 24.817, lng: 93.9368 }
  distCoords['aizawl'] = { lat: 23.7271, lng: 92.7176 }
  distCoords['kohima'] = { lat: 25.6751, lng: 94.1086 }
  distCoords['gangtok'] = { lat: 27.3389, lng: 88.6065 }
  distCoords['agartala'] = { lat: 23.8315, lng: 91.2868 }
  distCoords['itanagar'] = { lat: 27.0844, lng: 93.6053 }
  distCoords['siliguri'] = { lat: 26.7271, lng: 88.3953 }
  distCoords['moreh'] = { lat: 24.24, lng: 94.3 }
  distCoords['dawki'] = { lat: 25.18, lng: 92.02 }

  const roadColors: Record<string, string> = {
    accessible: '#41c18a',
    yellow: '#e0b649',
    orange: '#e18444',
    blocked: '#e76561',
    gray: '#718791',
  }

  return (
    <div className="relative w-full h-full bg-[#0b181f] overflow-hidden select-none">
      {/* Grid overlay */}
      <div className="map-grid" />

      {/* SVG Road network vectors */}
      {layers.roads && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}>
          {roads.map((road) => {
            const start = distCoords[road.startDistrict.toLowerCase()] ?? { lat: 26.14, lng: 91.73 }
            const end = distCoords[road.endDistrict.toLowerCase()] ?? { lat: 24.81, lng: 93.93 }
            const p1 = project(start)
            const p2 = project(end)
            const color = roadColors[road.status] ?? '#41c18a'
            const isBlocked = road.status === 'blocked'

            return (
              <g key={road.id} className="pointer-events-auto cursor-pointer" onClick={() => onRoadSelect(road)}>
                <line
                  x1={`${p1.x}%`}
                  y1={`${p1.y}%`}
                  x2={`${p2.x}%`}
                  y2={`${p2.y}%`}
                  stroke={color}
                  strokeWidth={isBlocked ? '5' : '3.5'}
                  strokeDasharray={isBlocked ? '8 5' : undefined}
                  strokeOpacity={0.88}
                  strokeLinecap="round"
                />
                <circle cx={`${(p1.x + p2.x) / 2}%`} cy={`${(p1.y + p2.y) / 2}%`} r="3" fill={color} />
              </g>
            )
          })}
        </svg>
      )}

      {/* District Node Markers */}
      {districts.map((d) => {
        const pos = project({ lat: d.lat, lng: d.lng })
        return (
          <div
            key={d.id}
            className="district-node"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 3 }}
            title={`${d.name} (${d.state}) · Connectivity Score ${d.connectivityScore ?? 75}/100`}
          >
            <span className="district-dot" />
            <span className="font-semibold">{d.name}</span>
          </div>
        )
      })}

      {/* Warehouse markers */}
      {layers.warehouses &&
        warehouses.map((w) => {
          const pos = project({ lat: w.lat, lng: w.lng })
          return (
            <button
              key={w.id}
              className="warehouse-marker"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 4 }}
              title={`Warehouse: ${w.name} (${w.currentInventory}% capacity)`}
              onClick={() => {}}
            >
              <WarehouseIcon size={12} />
            </button>
          )
        })}

      {/* Hospital markers */}
      {layers.hospitals &&
        hospitals.map((h) => {
          const pos = project({ lat: h.lat, lng: h.lng })
          return (
            <button
              key={h.id}
              className="vehicle-marker"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 4, background: '#e76561' }}
              title={`Hospital: ${h.name}`}
              onClick={() => {}}
            >
              <HospitalIcon size={12} color="#fff" />
            </button>
          )
        })}

      {/* Incident markers */}
      {layers.incidents &&
        incidents
          .filter((i) => i.status !== 'resolved')
          .map((inc) => {
            const pos = project({ lat: inc.lat, lng: inc.lng })
            const isCrit = inc.severity === 'critical'
            return (
              <button
                key={inc.id}
                className={`incident-marker ${isCrit ? 'severity-critical' : ''}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 6 }}
                title={`${inc.id} · ${inc.type.replace('_', ' ').toUpperCase()} (${inc.severity.toUpperCase()})`}
                onClick={() => onIncident(inc)}
              >
                <ShieldAlert size={14} />
              </button>
            )
          })}

      {/* Vehicle markers with live simulation */}
      {layers.vehicles &&
        vehicles.map((v) => {
          const pos = project(v.currentLocation)
          const isDelayed = v.status === 'delayed'
          const isEmergency = v.status === 'emergency' || v.cargoPriority === 'critical'
          const bg = isEmergency ? '#e76561' : isDelayed ? '#e9ad4b' : '#35c2d4'

          return (
            <button
              key={v.id}
              className="vehicle-marker transition-all duration-700 ease-out"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 7, backgroundColor: bg }}
              title={`${v.vehicleNumber} · ${v.cargo} · Driver: ${v.driverName} · Speed: ${v.speed} km/h · ETA: ${v.eta}`}
              onClick={() => onVehicle(v)}
            >
              <Truck size={12} color="#071418" />
            </button>
          )
        })}
    </div>
  )
}

export function RegionMap({
  vehicles,
  incidents,
  warehouses,
  hospitals,
  deliveries,
  roads = [],
  districts = [],
  language = 'en',
  gps = null,
  gpsError = '',
  onEnableLocation,
  simulation = false,
  emergency = false,
  primaryBlocked = false,
  onVehicle,
  onIncident,
  onReport,
  onRoadSelect,
}: {
  vehicles: Vehicle[]
  incidents: Incident[]
  warehouses: Warehouse[]
  hospitals: Hospital[]
  deliveries: Delivery[]
  roads?: Road[]
  districts?: District[]
  language?: AppLanguage
  gps?: GpsFix | null
  gpsError?: string
  onEnableLocation?: () => void
  simulation?: boolean
  emergency?: boolean
  primaryBlocked?: boolean
  onVehicle: (vehicle: Vehicle) => void
  onIncident: (incident: Incident) => void
  onReport: () => void
  onRoadSelect?: (road: Road) => void
}) {
  const apiKey = getGoogleMapsApiKey()
  const mapsReady = hasGoogleMapsKey()
  const shellRef = useRef<HTMLDivElement>(null)
  const centered = useRef(false)
  const [camera, setCamera] = useState<GeoPoint | null>(null)
  const [cameraZoom, setCameraZoom] = useState<number>()
  const [nerTick, setNerTick] = useState(0)
  const [layers, setLayers] = useState<LayersState>(defaultLayers)
  const [showLayers, setShowLayers] = useState(false)
  const [query, setQuery] = useState('')
  const [originId, setOriginId] = useState('gps')
  const [destinationId, setDestinationId] = useState(hospitals[0]?.id ?? '')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [candidates, setCandidates] = useState<RouteCandidate[]>([])
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [routeStatus, setRouteStatus] = useState('')
  const [mapError, setMapError] = useState('')
  const [inspectedRoad, setInspectedRoad] = useState<Road | null>(null)

  useEffect(() => {
    void getWeather('Guwahati').then(setWeather)
  }, [])

  useEffect(() => {
    if (gps && !centered.current) {
      centered.current = true
      setCamera(gps)
      setCameraZoom(14)
    }
  }, [gps])

  const origin = useMemo<GeoPoint | null>(() => {
    if (originId === 'gps') return gps
    const vehicle = vehicles.find((item) => item.id === originId)
    return vehicle?.currentLocation ?? null
  }, [gps, originId, vehicles])

  const destination = useMemo<GeoPoint | null>(() => {
    const hospital = hospitals.find((item) => item.id === destinationId)
    const warehouse = warehouses.find((item) => item.id === destinationId)
    const vehicle = vehicles.find((item) => item.id === destinationId)
    if (hospital) return { lat: hospital.lat, lng: hospital.lng }
    if (warehouse) return { lat: warehouse.lat, lng: warehouse.lng }
    return vehicle?.currentLocation ?? null
  }, [destinationId, hospitals, vehicles, warehouses])

  const goToMyLocation = useCallback(() => {
    if (gps) {
      setCamera({ ...gps })
      setCameraZoom(15)
      setOriginId('gps')
      return
    }
    onEnableLocation?.()
  }, [gps, onEnableLocation])

  const search = useCallback(async () => {
    const term = query.trim().toLowerCase()
    if (!term) return
    const vehicle = vehicles.find(
      (item) => item.vehicleNumber.toLowerCase().includes(term) || item.id.toLowerCase() === term
    )
    if (vehicle) {
      onVehicle(vehicle)
      setCamera(vehicle.currentLocation)
      setCameraZoom(12)
      return
    }
    const incident = incidents.find(
      (item) => item.id.toLowerCase().includes(term) || item.location.toLowerCase().includes(term)
    )
    if (incident) {
      onIncident(incident)
      setCamera({ lat: incident.lat, lng: incident.lng })
      setCameraZoom(11)
      return
    }
    const road = roads.find((r) => r.name.toLowerCase().includes(term))
    if (road) {
      setInspectedRoad(road)
      onRoadSelect?.(road)
    }
  }, [incidents, onIncident, onRoadSelect, onVehicle, query, roads, vehicles])

  const handleRoadClick = (road: Road) => {
    setInspectedRoad(road)
    onRoadSelect?.(road)
  }

  return (
    <div className="map-shell">
      <div className="map-toolbar">
        <div className="map-search">
          <Search size={15} />
          <input
            aria-label="Search map"
            placeholder="Search district, road (e.g. NH-14), vehicle, or hospital..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void search()}
          />
        </div>
        <select
          className="map-select"
          aria-label="Route origin"
          value={originId}
          onChange={(event) => setOriginId(event.target.value)}
        >
          <option value="gps">Use my location</option>
          {vehicles.slice(0, 8).map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.vehicleNumber} ({vehicle.origin})
            </option>
          ))}
        </select>
        <select
          className="map-select"
          aria-label="Route destination"
          value={destinationId}
          onChange={(event) => setDestinationId(event.target.value)}
        >
          {hospitals.map((hospital) => (
            <option key={hospital.id} value={hospital.id}>
              {hospital.name}
            </option>
          ))}
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`map-tool ${layers.traffic ? 'active' : ''}`}
          onClick={() => setLayers((current) => ({ ...current, traffic: !current.traffic }))}
        >
          <SlidersHorizontal size={15} /> Traffic
        </button>
        <button type="button" className="map-tool" onClick={onReport}>
          <ShieldAlert size={14} /> Report
        </button>
      </div>

      <div className="region-map relative" ref={shellRef} aria-label="Interactive North Eastern Region Live Operations Map">
        {mapsReady ? (
          <APIProvider apiKey={apiKey} libraries={[...GOOGLE_MAPS_LIBRARIES]} onError={() => setMapError(t(language, 'mapsLoadError'))}>
            <Map
              defaultCenter={NER_CENTER}
              defaultZoom={NER_OVERVIEW_ZOOM}
              mapTypeId="roadmap"
              colorScheme="DARK"
              gestureHandling="greedy"
              disableDefaultUI
              style={{ width: '100%', height: '100%' }}
            >
              <TrafficLayerControl enabled={layers.traffic} />
              <CameraSync target={camera} zoom={cameraZoom} fitNer={nerTick} />
              <GpsAccuracy fix={gps} />
              <RouteDrawers
                origin={origin}
                destination={destination}
                incidents={incidents}
                weather={weather}
                blocked={primaryBlocked}
                selectedId={selectedRoute}
                onCandidates={setCandidates}
                onStatus={setRouteStatus}
              />
              {layers.vehicles &&
                vehicles.map((vehicle) => (
                  <Marker
                    key={vehicle.id}
                    position={vehicle.currentLocation}
                    title={`${vehicle.vehicleNumber} · ${vehicle.cargo ?? 'Cargo'} · Demo GPS`}
                    label={{ text: vehicle.vehicleNumber.slice(-3), color: '#071418', fontSize: '10px', fontWeight: '700' }}
                    onClick={() => onVehicle(vehicle)}
                  />
                ))}
              {layers.incidents &&
                incidents.map((incident) => (
                  <Marker
                    key={incident.id}
                    position={{ lat: incident.lat, lng: incident.lng }}
                    title={`${incident.id} · ${incident.type.replace('_', ' ')}`}
                    label={{ text: '!', color: '#fff', fontSize: '13px', fontWeight: '800' }}
                    onClick={() => onIncident(incident)}
                  />
                ))}
              {layers.warehouses &&
                warehouses.map((warehouse) => (
                  <Marker
                    key={warehouse.id}
                    position={{ lat: warehouse.lat, lng: warehouse.lng }}
                    title={warehouse.name}
                    label={{ text: 'W', color: '#1a1710', fontSize: '10px', fontWeight: '800' }}
                  />
                ))}
              {layers.hospitals &&
                hospitals.map((hospital) => (
                  <Marker
                    key={hospital.id}
                    position={{ lat: hospital.lat, lng: hospital.lng }}
                    title={hospital.name}
                    label={{ text: 'H', color: '#071418', fontSize: '10px', fontWeight: '800' }}
                  />
                ))}
              {gps && (
                <Marker
                  position={{ lat: gps.lat, lng: gps.lng }}
                  title="Current GPS location"
                  label={{ text: 'YOU', color: '#051014', fontSize: '9px', fontWeight: '800' }}
                />
              )}
              <MapButtons
                traffic={layers.traffic}
                onTraffic={() => setLayers((current) => ({ ...current, traffic: !current.traffic }))}
                onLocate={goToMyLocation}
                onNer={() => setNerTick((value) => value + 1)}
                onLayers={() => setShowLayers((value) => !value)}
                onFullscreen={() => {
                  const node = shellRef.current
                  if (!node) return
                  if (document.fullscreenElement) void document.exitFullscreen()
                  else void node.requestFullscreen()
                }}
              />
            </Map>
          </APIProvider>
        ) : (
          <FallbackGisMap
            roads={roads}
            vehicles={vehicles}
            incidents={incidents}
            warehouses={warehouses}
            hospitals={hospitals}
            districts={districts}
            layers={layers}
            simulation={simulation}
            emergency={emergency}
            onVehicle={onVehicle}
            onIncident={onIncident}
            onRoadSelect={handleRoadClick}
          />
        )}

        <div className="map-label map-title">
          NORTH EASTERN REGION <span>LIVE OPERATIONS GIS MAP</span>
        </div>
        <div className="map-legend">
          <div><i className="legend-line green" />Safe</div>
          <div><i className="legend-line yellow" />Moderate</div>
          <div><i className="legend-line orange" />High risk</div>
          <div><i className="legend-line red" />Blocked</div>
        </div>
        <div className="map-live">
          <span className="pulse-dot" />
          {simulation ? 'SIMULATED GPS' : 'LIVE GPS FEED'} <b>{vehicles.filter((v) => v.status !== 'offline').length}</b>
        </div>

        {/* Road Detail Inspection Panel (Requirement #4) */}
        {inspectedRoad && (
          <div className="absolute top-12 left-4 z-20 w-80 bg-[#101c23]/95 backdrop-blur-md border border-[#2b3e48] rounded-lg p-4 shadow-2xl animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-[#24353f] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <RouteIcon size={16} className="text-[#35c2d4]" />
                <strong className="text-sm text-[#e9f0f2]">{inspectedRoad.name} Corridor</strong>
              </div>
              <button
                type="button"
                className="text-[#7d9099] hover:text-[#e9f0f2]"
                onClick={() => setInspectedRoad(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-[#cad6da]">
              <div className="flex justify-between items-center">
                <span className="text-[#7d9099]">Corridor Path:</span>
                <span className="font-medium text-right">{inspectedRoad.startDistrict} ➔ {inspectedRoad.endDistrict}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#7d9099]">Accessibility Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    inspectedRoad.status === 'blocked'
                      ? 'bg-[#e76561]/20 text-[#e76561] border border-[#e76561]/40'
                      : inspectedRoad.status === 'orange'
                      ? 'bg-[#e18444]/20 text-[#e18444] border border-[#e18444]/40'
                      : inspectedRoad.status === 'yellow'
                      ? 'bg-[#e0b649]/20 text-[#e0b649] border border-[#e0b649]/40'
                      : 'bg-[#41c18a]/20 text-[#41c18a] border border-[#41c18a]/40'
                  }`}
                >
                  {inspectedRoad.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Rainfall Index:</span>
                <span className="font-mono">{inspectedRoad.rainfallMm ?? 45} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Traffic Density:</span>
                <span className="font-medium capitalize">{inspectedRoad.trafficLevel ?? 'medium'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Road Condition:</span>
                <span>{inspectedRoad.roadCondition ?? 'Fair'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Landslide Probability:</span>
                <span className="font-mono text-[#e9ad4b]">{inspectedRoad.landslideProb ?? 35}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Flood Risk:</span>
                <span className="font-mono text-[#35c2d4]">{inspectedRoad.floodRisk ?? 20}%</span>
              </div>
              <div className="flex justify-between font-bold border-t border-[#24353f] pt-2">
                <span className="text-[#cad6da]">Overall AI Risk Score:</span>
                <span
                  className={`font-mono text-sm ${
                    (inspectedRoad.overallRisk ?? 40) >= 80 ? 'text-[#e76561]' : (inspectedRoad.overallRisk ?? 40) >= 60 ? 'text-[#e18444]' : 'text-[#41c18a]'
                  }`}
                >
                  {inspectedRoad.overallRisk ?? 42}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Estimated Delay:</span>
                <span className="font-mono text-[#e9ad4b]">+{inspectedRoad.delayMin ?? 15} minutes</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-3 w-full py-2 bg-[#35c2d4] text-[#071014] font-bold rounded flex items-center justify-center gap-2 hover:bg-[#2ab0c1] transition-all text-xs"
              onClick={() => {
                const queryCandidates = requestDrivingRoutes(
                  distCoords[inspectedRoad.startDistrict.toLowerCase()] ?? { lat: 26.14, lng: 91.73 },
                  distCoords[inspectedRoad.endDistrict.toLowerCase()] ?? { lat: 24.81, lng: 93.93 },
                  incidents,
                  weather,
                  inspectedRoad.status === 'blocked'
                )
                void queryCandidates.then(({ candidates }) => setCandidates(candidates))
              }}
            >
              <Zap size={14} /> [ FIND ALTERNATIVE ROUTE ]
            </button>
          </div>
        )}

        {showLayers && (
          <div className="map-layers">
            {(Object.keys(layers) as MapLayerId[]).map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}
                />
                {key}
              </label>
            ))}
          </div>
        )}
      </div>

      {candidates.length > 0 && (
        <div className="map-routes">
          {primaryBlocked && <div className="map-route-alert">{t(language, 'primaryBlocked')}</div>}
          {candidates.map((route) => (
            <button
              key={route.id}
              type="button"
              className={`map-route ${route.isRecommended ? 'recommended' : ''} ${selectedRoute === route.id ? 'active' : ''}`}
              onClick={() => setSelectedRoute(route.id)}
            >
              <div className="flex items-center justify-between">
                <b>{route.name ?? route.summary}</b>
                {route.isRecommended && (
                  <span className="px-2 py-0.5 bg-[#35c2d4]/20 text-[#35c2d4] border border-[#35c2d4]/40 rounded text-[9px] font-bold">
                    RECOMMENDED
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#cad6da]">
                {route.distance} km · {route.estimatedTime} min · {route.trafficLevel} traffic
              </span>
              <span className="text-[9px] text-[#7d9099]">
                {route.reason ?? 'Alternative corridor calculated.'}
              </span>
              {route.riskReduction && route.riskReduction > 0 ? (
                <div className="mt-1 flex gap-2 text-[9px] font-mono text-[#55d29d]">
                  <span>Risk Reduction: {route.riskReduction}%</span>
                  <span>+{route.additionalDistanceKm ?? 38} km (+{route.additionalTimeMin ?? 42} min)</span>
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const distCoords: Record<string, GeoPoint> = {
  guwahati: { lat: 26.1445, lng: 91.7362 },
  shillong: { lat: 25.5788, lng: 91.8933 },
  imphal: { lat: 24.817, lng: 93.9368 },
  aizawl: { lat: 23.7271, lng: 92.7176 },
  kohima: { lat: 25.6751, lng: 94.1086 },
  gangtok: { lat: 27.3389, lng: 88.6065 },
  agartala: { lat: 23.8315, lng: 91.2868 },
  itanagar: { lat: 27.0844, lng: 93.6053 },
}
