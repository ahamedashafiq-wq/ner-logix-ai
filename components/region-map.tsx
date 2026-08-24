'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { Activity, AlertTriangle, Crosshair, Layers, Maximize2, Search, SlidersHorizontal } from 'lucide-react'
import { NER_BOUNDS, NER_CENTER, NER_OVERVIEW_ZOOM, isValidPoint } from '@/lib/geo'
import { t, type AppLanguage } from 'lib/i18n'
import { getGoogleMapsApiKey, GOOGLE_MAPS_LIBRARIES, hasGoogleMapsKey } from '@/services/google-maps'
import { geocodeInNer, requestDrivingRoutes } from '@/services/routes'
import { getWeather } from '@/services/weather'
import type { Delivery, GeoPoint, GpsFix, Hospital, Incident, MapLayerId, RouteCandidate, Vehicle, Warehouse, WeatherData } from '@/types'

type LayersState = Record<MapLayerId, boolean>

const defaultLayers: LayersState = {
  traffic: true,
  vehicles: true,
  incidents: true,
  warehouses: true,
  hospitals: true,
  deliveries: true,
  risk: true,
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
      map.fitBounds({ north: NER_BOUNDS.north, south: NER_BOUNDS.south, east: NER_BOUNDS.east, west: NER_BOUNDS.west })
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
  const renderers = useRef<google.maps.DirectionsRenderer[]>([])

  useEffect(() => {
    let cancelled = false
    const clear = () => {
      renderers.current.forEach((renderer) => renderer.setMap(null))
      renderers.current = []
    }
    if (!map || !origin || !destination || !window.google?.maps) {
      clear()
      onCandidates([])
      return
    }
    void requestDrivingRoutes(origin, destination, incidents, weather, blocked).then(({ candidates, status, result }) => {
      if (cancelled) return
      clear()
      onStatus(status)
      onCandidates(candidates)
      if (!result) return
      renderers.current = result.routes.map((_, index) => {
        const candidate = candidates[index]
        const active = !selectedId || selectedId === candidate?.id
        return new window.google.maps.DirectionsRenderer({
          map,
          directions: result,
          routeIndex: index,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: candidate?.isRecommended ? '#35c2d4' : candidate?.accessibility === 'blocked' ? '#e76561' : '#e9ad4b',
            strokeOpacity: active ? (candidate?.isRecommended ? 0.95 : 0.55) : 0.2,
            strokeWeight: candidate?.isRecommended ? 6 : 4,
          },
        })
      })
    })
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

export function RegionMap({
  vehicles,
  incidents,
  warehouses,
  hospitals,
  deliveries,
  language = 'en',
  gps,
  gpsError,
  onEnableLocation,
  simulation,
  emergency,
  primaryBlocked,
  onVehicle,
  onIncident,
  onReport,
}: {
  vehicles: Vehicle[]
  incidents: Incident[]
  warehouses: Warehouse[]
  hospitals: Hospital[]
  deliveries: Delivery[]
  language?: AppLanguage
  gps: GpsFix | null
  gpsError: string
  onEnableLocation: () => void
  simulation: boolean
  emergency: boolean
  primaryBlocked: boolean
  onVehicle: (vehicle: Vehicle) => void
  onIncident: (incident: Incident) => void
  onReport: () => void
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
  const [searchPoint, setSearchPoint] = useState<GeoPoint | null>(null)

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
    onEnableLocation()
  }, [gps, onEnableLocation])

  const search = useCallback(async () => {
    const term = query.trim().toLowerCase()
    if (!term) return
    const vehicle = vehicles.find((item) => item.vehicleNumber.toLowerCase().includes(term) || item.id.toLowerCase() === term)
    if (vehicle) {
      onVehicle(vehicle)
      setCamera(vehicle.currentLocation)
      setCameraZoom(12)
      return
    }
    const delivery = deliveries.find((item) => item.id.toLowerCase().includes(term))
    if (delivery?.vehicleId) {
      const linked = vehicles.find((item) => item.id === delivery.vehicleId)
      if (linked) {
        onVehicle(linked)
        setCamera(linked.currentLocation)
        setCameraZoom(12)
        return
      }
    }
    const incident = incidents.find((item) => item.id.toLowerCase().includes(term) || item.location.toLowerCase().includes(term))
    if (incident) {
      onIncident(incident)
      setCamera({ lat: incident.lat, lng: incident.lng })
      setCameraZoom(11)
      return
    }
    const warehouse = warehouses.find((item) => item.name.toLowerCase().includes(term))
    if (warehouse) {
      setCamera({ lat: warehouse.lat, lng: warehouse.lng })
      setCameraZoom(12)
      return
    }
    const hospital = hospitals.find((item) => item.name.toLowerCase().includes(term))
    if (hospital) {
      setCamera({ lat: hospital.lat, lng: hospital.lng })
      setCameraZoom(12)
      return
    }
    const point = await geocodeInNer(query)
    if (point) {
      setSearchPoint(point)
      setCamera(point)
      setCameraZoom(11)
    }
  }, [deliveries, hospitals, incidents, onIncident, onVehicle, query, vehicles, warehouses])

  const visibleVehicles = emergency ? vehicles.filter((vehicle) => vehicle.cargo?.toLowerCase().includes('medic') || vehicle.status === 'emergency') : vehicles
  const visibleIncidents = emergency ? incidents.filter((incident) => incident.severity === 'critical' || incident.severity === 'high') : incidents

  return (
    <div className="map-shell">
      <div className="map-toolbar">
        <div className="map-search">
          <Search size={15} />
          <input aria-label="Search map" placeholder="Search district, city, vehicle, delivery, hospital" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void search()} />
        </div>
        <select className="map-select" aria-label="Route origin" value={originId} onChange={(event) => setOriginId(event.target.value)}>
          <option value="gps">Use my location</option>
          {vehicles.slice(0, 8).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNumber}</option>)}
        </select>
        <select className="map-select" aria-label="Route destination" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
          {hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </select>
        <button type="button" className={`map-tool ${layers.traffic ? 'active' : ''}`} onClick={() => setLayers((current) => ({ ...current, traffic: !current.traffic }))}>
          <SlidersHorizontal size={15} /> Traffic {layers.traffic ? 'ON' : 'OFF'}
        </button>
        <button type="button" className="map-tool" onClick={onReport}>Report</button>
      </div>
      <div className="region-map" ref={shellRef} aria-label="Google Maps live operations map for the North Eastern Region">
        {!mapsReady ? (
          <div className="map-missing-key">
            <AlertTriangle size={20} />
            <b>{t(language, 'mapsMissingKey')}</b>
            <span>Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local and enable Maps JavaScript, Directions, Geocoding, and Places APIs.</span>
          </div>
        ) : (
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
              {layers.vehicles && visibleVehicles.map((vehicle) => (
                <Marker
                  key={vehicle.id}
                  position={vehicle.currentLocation}
                  title={`${vehicle.vehicleNumber} · ${vehicle.cargo ?? 'Cargo'} · Demo GPS`}
                  label={{ text: vehicle.vehicleNumber.slice(-3), color: '#071418', fontSize: '10px', fontWeight: '700' }}
                  onClick={() => onVehicle(vehicle)}
                />
              ))}
              {layers.incidents && visibleIncidents.map((incident) => (
                <Marker
                  key={incident.id}
                  position={{ lat: incident.lat, lng: incident.lng }}
                  title={`${incident.id} · ${incident.type.replace('_', ' ')}`}
                  label={{ text: '!', color: '#fff', fontSize: '13px', fontWeight: '800' }}
                  onClick={() => onIncident(incident)}
                />
              ))}
              {layers.warehouses && warehouses.map((warehouse) => (
                <Marker key={warehouse.id} position={{ lat: warehouse.lat, lng: warehouse.lng }} title={warehouse.name} label={{ text: 'W', color: '#1a1710', fontSize: '10px', fontWeight: '800' }} />
              ))}
              {layers.hospitals && hospitals.map((hospital) => (
                <Marker key={hospital.id} position={{ lat: hospital.lat, lng: hospital.lng }} title={hospital.name} label={{ text: 'H', color: '#071418', fontSize: '10px', fontWeight: '800' }} />
              ))}
              {gps && <Marker position={{ lat: gps.lat, lng: gps.lng }} title="Current GPS location" label={{ text: 'YOU', color: '#051014', fontSize: '9px', fontWeight: '800' }} />}
              {searchPoint && <Marker position={searchPoint} title="Search result" />}
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
        )}
        <div className="map-label map-title">NORTH EASTERN REGION <span>LIVE GOOGLE MAP</span></div>
        <div className="map-legend">
          <div><i className="legend-line green" />Accessible</div>
          <div><i className="legend-line yellow" />Caution</div>
          <div><i className="legend-line orange" />High risk</div>
          <div><i className="legend-line red" />Blocked</div>
        </div>
        <div className="map-live"><span className="pulse-dot" />{simulation ? 'DEMO GPS' : 'LIVE GPS'} <b>{vehicles.filter((vehicle) => vehicle.status !== 'offline').length}</b></div>
        {(gpsError || mapError || routeStatus) && (
          <div className="map-banner">
            <span>{mapError || gpsError || (routeStatus !== 'OK' ? routeStatus : '')}</span>
            {gpsError && <button type="button" onClick={onEnableLocation}>{t(language, 'enableLocation')}</button>}
          </div>
        )}
        {showLayers && (
          <div className="map-layers">
            {(Object.keys(layers) as MapLayerId[]).map((key) => (
              <label key={key}>
                <input type="checkbox" checked={layers[key]} onChange={() => setLayers((current) => ({ ...current, [key]: !current[key] }))} />
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
            <button key={route.id} type="button" className={`map-route ${route.isRecommended ? 'recommended' : ''} ${selectedRoute === route.id ? 'active' : ''}`} onClick={() => setSelectedRoute(route.id)}>
              <b>{route.isRecommended ? 'Recommended' : route.summary}</b>
              <span>{route.distance} km · {route.estimatedTime} min · {route.trafficLevel} traffic</span>
              <span>{route.accessibility?.replace('_', ' ')} · score {route.score}/100 · {t(language, 'prototypePrediction')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
