'use client'

import { useEffect, useMemo, useState } from 'react'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, AlertTriangle, Ambulance, ArrowDownRight, ArrowUpRight, Bell, Boxes, BrainCircuit, ChevronDown, CircleHelp, Clock3, CloudRain, Crosshair, FileWarning, Gauge, Hospital as HospitalIcon, MapPin, Menu, Package, Radio, Route as RouteIcon, Search, Settings, ShieldAlert, Siren, SlidersHorizontal, Truck, UserRound, Warehouse as WarehouseIcon, X, Zap } from 'lucide-react'
import { alerts, deliveryTrend, hospitals, incidents, kpis, logisticsHealth, mapStates, predictions, riskTrend, supplies, vehicles, warehouses } from '@/mock/data'
import type { Alert, GeoPoint, Hospital, Incident, Vehicle } from '@/types'

const navItems = [
  { label: 'Dashboard', icon: Gauge }, { label: 'Live Map', icon: MapPin }, { label: 'Vehicles', icon: Truck }, { label: 'Deliveries', icon: Package },
  { label: 'Routes', icon: RouteIcon }, { label: 'Incidents', icon: AlertTriangle }, { label: 'Predictions', icon: BrainCircuit }, { label: 'Supplies', icon: Boxes },
  { label: 'Warehouses', icon: WarehouseIcon }, { label: 'Analytics', icon: Activity }, { label: 'Field Reports', icon: Crosshair }, { label: 'Settings', icon: Settings },
]
const iconMap: Record<string, typeof Truck> = { truck: Truck, package: Package, triangle: AlertTriangle, route: RouteIcon, bell: Bell, clock: Clock3, boxes: Boxes, activity: Activity }
const coimbatoreCenter: GeoPoint = { lat: 11.0168, lng: 76.9558 }
const sourceRegionCenter: GeoPoint = { lat: 25.35, lng: 92.35 }
const mapApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

function projectToCoimbatore(point: GeoPoint): GeoPoint {
  return {
    lat: coimbatoreCenter.lat + (point.lat - sourceRegionCenter.lat) * 0.16,
    lng: coimbatoreCenter.lng + (point.lng - sourceRegionCenter.lng) * 0.16,
  }
}

function StatusPill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' }) {
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>
}
function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>
}
function KpiCard({ item }: { item: typeof kpis[number] }) {
  const Icon = iconMap[item.icon] ?? Activity
  const positive = !item.trend.startsWith('-')
  return <div className="kpi-card"><div className="kpi-icon"><Icon size={17} /></div><div className="kpi-label">{item.label}</div><div className="kpi-value">{item.value}</div><div className={`kpi-trend ${positive ? 'positive' : 'negative'}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{item.trend}<span>vs yesterday</span></div></div>
}
function isValidPoint(point?: GeoPoint | null) {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180
}

function vehicleMapPoint(vehicle: Vehicle, index: number): GeoPoint {
  const projected = projectToCoimbatore(vehicle.currentLocation)
  return { lat: projected.lat + ((index % 3) - 1) * 0.008, lng: projected.lng + ((index % 4) - 1.5) * 0.008 }
}

function incidentMapPoint(incident: Incident, index: number): GeoPoint {
  const projected = projectToCoimbatore({ lat: incident.lat, lng: incident.lng })
  return { lat: projected.lat + ((index % 2) - 0.5) * 0.01, lng: projected.lng + ((index % 3) - 1) * 0.01 }
}

function markerIcon(color: string, scale = 7) {
  if (!window.google?.maps) return undefined
  return { path: window.google.maps.SymbolPath.CIRCLE, scale, fillColor: color, fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 1.5 }
}

function TrafficLayer({ enabled, onUnavailable }: { enabled: boolean; onUnavailable: (message: string) => void }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || !map || !window.google?.maps) return
    let trafficLayer: google.maps.TrafficLayer | null = null
    try {
      trafficLayer = new window.google.maps.TrafficLayer()
      trafficLayer.setMap(map)
    } catch {
      onUnavailable('Traffic layer unavailable')
    }
    return () => trafficLayer?.setMap(null)
  }, [enabled, map, onUnavailable])
  return null
}

function DirectionsRoute({ origin, destination, onRouteInfo, onRouteStatus }: { origin: GeoPoint | null; destination: GeoPoint | null; onRouteInfo: (info: string) => void; onRouteStatus: (message: string) => void }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !window.google?.maps || !isValidPoint(origin) || !isValidPoint(destination)) {
      onRouteInfo('')
      return
    }
    const renderer = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: false,
      polylineOptions: { strokeColor: '#35c2d4', strokeOpacity: 0.92, strokeWeight: 5, zIndex: 40 },
    })
    const service = new window.google.maps.DirectionsService()
    service.route({
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      drivingOptions: { departureTime: new Date(), trafficModel: window.google.maps.TrafficModel.BEST_GUESS },
      provideRouteAlternatives: false,
    }, (result, status) => {
      if (status !== window.google.maps.DirectionsStatus.OK || !result) {
        onRouteInfo('')
        onRouteStatus(status === window.google.maps.DirectionsStatus.REQUEST_DENIED ? 'Traffic-aware routing unavailable' : 'Route unavailable')
        return
      }
      renderer.setDirections(result)
      const leg = result.routes[0]?.legs[0]
      const duration = leg?.duration_in_traffic?.text ?? leg?.duration?.text
      onRouteInfo(`${leg?.distance?.text ?? 'Distance unavailable'} · ${duration ?? 'ETA unavailable'}${leg?.duration_in_traffic ? ' with traffic' : ''}`)
      onRouteStatus(leg?.duration_in_traffic ? '' : 'Traffic-aware routing unavailable')
    })
    return () => renderer.setMap(null)
  }, [destination, map, onRouteInfo, onRouteStatus, origin])
  return null
}

function MapControls({ trafficEnabled, onLocate, onTrafficToggle, onMessage }: { trafficEnabled: boolean; onLocate: (point: GeoPoint) => void; onTrafficToggle: () => void; onMessage: (message: string) => void }) {
  const map = useMap()
  const locate = () => {
    if (!navigator.geolocation) {
      onMessage('Browser location unavailable')
      return
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const point = { lat: coords.latitude, lng: coords.longitude }
      onLocate(point)
      map?.panTo(point)
      map?.setZoom(14)
      onMessage('')
    }, () => onMessage('Location permission denied'), { enableHighAccuracy: false, timeout: 10000 })
  }
  return <div className="map-controls"><button aria-label="Zoom in" onClick={() => map?.setZoom((map.getZoom() ?? 12) + 1)}>+</button><button aria-label="Zoom out" onClick={() => map?.setZoom((map.getZoom() ?? 12) - 1)}>−</button><button aria-label="My Location" title="My Location" onClick={locate}><Crosshair size={15} /></button><button aria-label="Toggle traffic" title="Traffic" className={trafficEnabled ? 'active' : ''} onClick={onTrafficToggle}><Activity size={14} /></button></div>
}

function RegionMap({ onVehicle, onIncident, simulation }: { onVehicle: (v: Vehicle) => void; onIncident: (i: Incident) => void; simulation: boolean }) {
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null)
  const [selectedOrigin, setSelectedOrigin] = useState(vehicles[0]?.id ?? '')
  const [selectedHospital, setSelectedHospital] = useState(hospitals[0]?.id ?? '')
  const [trafficEnabled, setTrafficEnabled] = useState(true)
  const [routeInfo, setRouteInfo] = useState('')
  const [mapMessage, setMapMessage] = useState('')
  const mappedVehicles = vehicles.slice(0, 12).map((vehicle, index) => ({ vehicle: simulation && index === 0 ? { ...vehicle, status: 'emergency' as const, type: 'van' as const } : vehicle, position: vehicleMapPoint(vehicle, index) })).filter(({ position }) => isValidPoint(position))
  const selectedVehicle = mappedVehicles.find(({ vehicle }) => vehicle.id === selectedOrigin)
  const selectedDestination = hospitals.find((hospital) => hospital.id === selectedHospital)
  const routeOrigin = selectedOrigin === 'current' ? currentLocation : selectedVehicle?.position ?? null
  const routeDestination = selectedDestination ? { lat: selectedDestination.lat, lng: selectedDestination.lng } : null

  useEffect(() => {
    if (simulation) {
      setSelectedOrigin(vehicles[0]?.id ?? '')
      setSelectedHospital(hospitals[0]?.id ?? '')
      setMapMessage('Emergency ambulance route active')
    }
  }, [simulation])

  const vehicleStatusColor = (vehicle: Vehicle) => vehicle.status === 'emergency' ? '#e76561' : vehicle.status === 'delayed' ? '#e9ad4b' : vehicle.status === 'available' || vehicle.status === 'assigned' ? '#8fa6ad' : '#35c2d4'
  const incidentSeverityColor = (incident: Incident) => incident.severity === 'critical' ? '#e76561' : incident.severity === 'high' ? '#e18444' : incident.severity === 'medium' ? '#e0b649' : '#55d29d'
  return <div className="map-shell">
    <div className="map-toolbar"><div className="map-search"><Search size={15} /><input aria-label="Search map" placeholder="Search district, ambulance or hospital" /></div><select className="map-select" aria-label="Select ambulance" value={selectedOrigin} onChange={(event) => setSelectedOrigin(event.target.value)}>{currentLocation && <option value="current">My location</option>}{mappedVehicles.slice(0, 8).map(({ vehicle }) => <option key={vehicle.id} value={vehicle.id}>{vehicle.status === 'emergency' ? 'AMB' : 'Vehicle'} {vehicle.vehicleNumber}</option>)}</select><select className="map-select" aria-label="Select hospital" value={selectedHospital} onChange={(event) => setSelectedHospital(event.target.value)}>{hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}</select><button className={`map-tool ${trafficEnabled ? 'active' : ''}`} onClick={() => setTrafficEnabled((value) => !value)}><SlidersHorizontal size={15} /> Traffic</button><button className="map-tool">Road map <ChevronDown size={14} /></button></div>
    <div className="region-map" aria-label="Google Maps live operations map centered on Coimbatore">
      {mapApiKey ? <APIProvider apiKey={mapApiKey}>
        <Map defaultCenter={coimbatoreCenter} defaultZoom={12} mapTypeId="roadmap" gestureHandling="greedy" disableDefaultUI style={{ width: '100%', height: '100%' }}>
          <TrafficLayer />
          <RoutePolylines simulation={simulation} />
          {activeVehicles.map((vehicle) => <Marker key={vehicle.id} position={projectToCoimbatore(vehicle.currentLocation)} title={`${vehicle.vehicleNumber} · ${vehicle.driverName}`} label={{ text: vehicle.vehicleNumber.slice(-3), color: '#071418', fontSize: '10px', fontWeight: '700' }} onClick={() => onVehicle(vehicle)} />)}
          {incidents.slice(0, 4).map((incident) => <Marker key={incident.id} position={projectToCoimbatore({ lat: incident.lat, lng: incident.lng })} title={`${incident.id} · ${incident.type.replace('_', ' ')}`} label={{ text: '!', color: '#fff', fontSize: '13px', fontWeight: '800' }} onClick={() => onIncident(incident)} />)}
          {warehouses.map((warehouse) => <Marker key={warehouse.id} position={projectToCoimbatore({ lat: warehouse.lat, lng: warehouse.lng })} title={warehouse.name} label={{ text: 'W', color: '#1a1710', fontSize: '10px', fontWeight: '800' }} />)}
          {currentLocation && <Marker position={currentLocation} title="Current location" label={{ text: 'YOU', color: '#051014', fontSize: '9px', fontWeight: '800' }} />}
        </Map>
        <MapControls onLocate={setCurrentLocation} />
      </APIProvider> : <div className="map-missing-key"><AlertTriangle size={20} /><b>Google Maps API key missing</b><span>Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.</span></div>}
      <div className="map-label map-title">COIMBATORE, INDIA <span>LIVE OPERATIONS MAP</span></div>
      <div className="map-legend"><div><i className="legend-line green" />Accessible</div><div><i className="legend-line yellow" />Caution</div><div><i className="legend-line orange" />High risk</div><div><i className="legend-line red" />Blocked</div></div>
      <div className="map-live"><span className="pulse-dot" />LIVE GPS FEED <b>247</b></div>
    </div>
  </div>
}
function AlertRow({ alert }: { alert: Alert }) { return <div className="alert-row"><div className={`alert-symbol ${alert.severity}`}><AlertTriangle size={15} /></div><div className="alert-copy"><b>{alert.message}</b><span>{alert.timestamp}</span></div><button className="icon-button" aria-label="Open alert"><ChevronDown size={15} /></button></div> }
function HealthScore() { return <div className="health-panel"><div className="score-ring" style={{ '--score': `${logisticsHealth.overallScore * 3.6}deg` } as React.CSSProperties}><div><strong>{logisticsHealth.overallScore}</strong><span>/ 100</span></div></div><div className="health-copy"><div className="eyebrow">SYSTEM STATUS</div><h3>Logistics health</h3><StatusPill tone="green">Operating normally</StatusPill></div><div className="health-breakdown">{[['Road accessibility', logisticsHealth.roadAccessibility], ['Vehicle availability', logisticsHealth.vehicleAvailability], ['Delivery reliability', logisticsHealth.deliveryReliability], ['Risk readiness', logisticsHealth.riskLevel], ['Supply readiness', logisticsHealth.supplyReadiness]].map(([label, value]) => <div className="health-row" key={label as string}><span>{label as string}</span><b>{value}%</b><i><em style={{ width: `${value}%` }} /></i></div>)}</div></div> }

export default function NerLogixApp() {
  const [active, setActive] = useState('Dashboard'); const [mobileOpen, setMobileOpen] = useState(false); const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null); const [emergency, setEmergency] = useState(false); const [simulation, setSimulation] = useState(false); const [demoRunning, setDemoRunning] = useState(false)
  const [toast, setToast] = useState('')
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3200) }
  const pageTitle = active === 'Dashboard' ? 'Operations overview' : active
  const activeVehicles = useMemo(() => vehicles.filter(v => v.status !== 'offline'), [])
  const startDemo = () => { setDemoRunning(true); notify('Demo sequence started · Medical delivery NER104 dispatched'); window.setTimeout(() => { setSimulation(true); notify('Heavy rainfall detected · NH-14 risk elevated') }, 2600); window.setTimeout(() => { notify('Alternate route found · 8 vehicles rerouted safely') }, 5400); window.setTimeout(() => setDemoRunning(false), 7600) }
  const selectNav = (label: string) => { setActive(label); setMobileOpen(false) }
  return <div className={`app-shell ${emergency ? 'emergency-mode' : ''}`}>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}><div className="brand"><div className="brand-mark"><Radio size={17} /></div><div><strong>NER-LOGIX <em>AI</em></strong><span>COMMAND CENTER</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div><div className="system-status"><span className="online-dot" /> SYSTEMS ONLINE <span>•</span> 04:32:18 UTC</div><nav>{navItems.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'active' : ''} onClick={() => selectNav(label)}><Icon size={17} /><span>{label}</span>{label === 'Incidents' && <b className="nav-count">18</b>}</button>)}</nav><div className="sidebar-footer"><div className="offline-card"><CloudRain size={16} /><div><b>Weather watch active</b><span>Next update in 04:12</span></div></div><div className="profile"><div className="avatar">AS</div><div><b>Aarav Sharma</b><span>System Administrator</span></div><ChevronDown size={14} /></div></div></aside>
    <main className="main-content"><header className="topbar"><button className="menu-button" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>NER-LOGIX AI</span><i>/</i><b>{pageTitle}</b></div><div className="top-actions"><div className="top-clock"><span className="online-dot" /> LIVE <b>14:32:18</b></div><button className="icon-button notification" aria-label="Notifications" onClick={() => notify('You have 7 critical alerts')}><Bell size={18} /><i>7</i></button><button className={`emergency-button ${emergency ? 'active' : ''}`} onClick={() => { setEmergency(!emergency); notify(!emergency ? 'Emergency operations mode activated' : 'Emergency mode deactivated') }}><Siren size={16} />{emergency ? 'Emergency active' : 'Emergency mode'}</button></div></header>
      <div className="page-content"><div className="page-header"><div><div className="eyebrow">SATURDAY, 23 AUGUST 2026 · 14:32 IST</div><h1>{emergency ? 'Emergency operations center' : 'Operations overview'}</h1><p>{emergency ? 'Priority routing is active for critical relief supplies across the region.' : 'Real-time visibility across the North Eastern Region logistics network.'}</p></div><div className="header-buttons"><button className="secondary-button" onClick={() => notify('Report workflow opened')}><FileWarning size={15} /> Report incident</button><button className="primary-button" onClick={startDemo} disabled={demoRunning}><Zap size={15} /> {demoRunning ? 'Demo running…' : 'Start demo'}</button></div></div>
        {emergency && <div className="emergency-banner"><Siren size={20} /><div><b>EMERGENCY MODE ACTIVE</b><span>Critical deliveries are prioritized. 17 critical deliveries · 6 affected routes · 12 vehicles rerouted.</span></div><button onClick={() => setEmergency(false)}>Exit mode</button></div>}
        {active === 'Dashboard' || active === 'Live Map' ? <><div className="kpi-grid">{kpis.map((item) => <KpiCard item={item} key={item.label} />)}</div><div className="dashboard-grid"><section><SectionHeading eyebrow="REGIONAL VISIBILITY" title="Live network map" action={<div className="section-actions"><StatusPill tone="green">Live feed</StatusPill><button className="text-button" onClick={() => setActive('Live Map')}>Expand map <ArrowUpRight size={14} /></button></div>} /><RegionMap onVehicle={setSelectedVehicle} onIncident={setSelectedIncident} simulation={simulation} /></section><aside className="right-rail"><SectionHeading eyebrow="REQUIRES ATTENTION" title="Alert center" action={<button className="text-button" onClick={() => setActive('Incidents')}>View all</button>} /><div className="alert-list">{alerts.map((alert) => <AlertRow alert={alert} key={alert.id} />)}</div><div className="quick-actions"><div className="eyebrow">QUICK ACTIONS</div><div className="quick-grid"><button onClick={() => setSimulation(true)}><CloudRain size={17} /><span>Run simulation</span></button><button onClick={() => setActive('Routes')}><RouteIcon size={17} /><span>Optimize route</span></button><button onClick={() => setActive('Field Reports')}><Crosshair size={17} /><span>Field report</span></button><button onClick={() => setActive('Predictions')}><BrainCircuit size={17} /><span>Risk forecast</span></button></div></div></aside></div><div className="lower-grid"><div className="panel chart-panel"><SectionHeading eyebrow="NETWORK PERFORMANCE" title="Delivery throughput" action={<button className="filter-button">Last 7 days <ChevronDown size={13} /></button>} /><div className="chart-legend"><span><i className="legend-dot cyan" />Delivered</span><span><i className="legend-dot amber" />Delayed</span></div><ResponsiveContainer width="100%" height={190}><AreaChart data={deliveryTrend} margin={{ left: -22, right: 5, top: 10, bottom: 0 }}><defs><linearGradient id="deliveryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#35c2d4" stopOpacity={0.28} /><stop offset="100%" stopColor="#35c2d4" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#24313b" vertical={false} /><XAxis dataKey="day" tick={{ fill: '#70808b', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#70808b', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#132029', border: '1px solid #2b3b46', borderRadius: 8, color: '#f0f4f5' }} /><Area type="monotone" dataKey="delivered" stroke="#35c2d4" fill="url(#deliveryFill)" strokeWidth={2} /><Area type="monotone" dataKey="delayed" stroke="#e9ad4b" fill="none" strokeWidth={2} /></AreaChart></ResponsiveContainer></div><div className="panel chart-panel"><SectionHeading eyebrow="PREDICTIVE INTELLIGENCE" title="Regional risk index" action={<StatusPill tone="blue">Simulated AI</StatusPill>} /><div className="risk-headline"><strong>48.6</strong><span>Moderate risk · +6.2% today</span></div><ResponsiveContainer width="100%" height={190}><AreaChart data={riskTrend} margin={{ left: -22, right: 5, top: 20, bottom: 0 }}><CartesianGrid stroke="#24313b" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#70808b', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fill: '#70808b', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#132029', border: '1px solid #2b3b46', borderRadius: 8 }} /><Area type="monotone" dataKey="risk" stroke="#e9ad4b" fill="#e9ad4b" fillOpacity={0.1} strokeWidth={2} /></AreaChart></ResponsiveContainer></div><HealthScore /></div>
        </> : <ModuleView active={active} onNotify={notify} onVehicle={setSelectedVehicle} />}
      </div>
    </main>
    {selectedVehicle && <div className="detail-drawer"><button className="drawer-close" onClick={() => setSelectedVehicle(null)}><X size={18} /></button><div className="eyebrow">VEHICLE DETAIL</div><h2>{selectedVehicle.vehicleNumber}</h2><StatusPill tone={selectedVehicle.status === 'delayed' ? 'amber' : 'green'}>{selectedVehicle.status.replace('_', ' ').toUpperCase()}</StatusPill><div className="drawer-stat-grid"><div><span>Driver</span><b>{selectedVehicle.driverName}</b></div><div><span>Cargo</span><b>{selectedVehicle.cargo}</b></div><div><span>Load</span><b>{selectedVehicle.currentLoad} kg</b></div><div><span>Speed</span><b>{selectedVehicle.speed} km/h</b></div><div><span>Destination</span><b>{selectedVehicle.destination}</b></div><div><span>ETA</span><b>{selectedVehicle.eta}</b></div></div><div className="drawer-route"><div className="route-pulse" /><div><b>Current route</b><span>NH-14 · 62% complete</span></div></div><button className="primary-button full" onClick={() => notify(`Tracking ${selectedVehicle.vehicleNumber}`)}>Open live tracking <ArrowUpRight size={15} /></button></div>}
    {selectedIncident && <div className="detail-drawer"><button className="drawer-close" onClick={() => setSelectedIncident(null)}><X size={18} /></button><div className="eyebrow">INCIDENT · {selectedIncident.id}</div><h2>{selectedIncident.type.replace('_', ' ')}</h2><StatusPill tone={selectedIncident.severity === 'critical' ? 'red' : 'amber'}>{selectedIncident.severity.toUpperCase()}</StatusPill><p className="drawer-description">{selectedIncident.description}</p><div className="drawer-stat-grid"><div><span>Location</span><b>{selectedIncident.location}</b></div><div><span>AI confidence</span><b>{selectedIncident.confidence}%</b></div><div><span>Reported</span><b>{selectedIncident.timestamp}</b></div><div><span>Status</span><b>{selectedIncident.status}</b></div></div><button className="primary-button full" onClick={() => notify('Incident marked for verification')}>Verify incident <ShieldAlert size={15} /></button></div>}
    {simulation && <div className="modal-backdrop"><div className="simulation-modal"><button className="drawer-close" onClick={() => setSimulation(false)}><X size={18} /></button><div className="simulation-icon"><CloudRain size={23} /></div><div className="eyebrow">SIMULATION CENTER · DEMO</div><h2>Road disruption scenario</h2><p>Test how the command center responds when severe weather changes accessibility on a critical corridor.</p><div className="simulation-options">{['Simulate flood', 'Simulate landslide', 'Simulate heavy rain', 'Simulate road closure'].map((label, i) => <button key={label} onClick={() => notify(`${label} triggered · AI calculating alternate route`)}><span className={`option-icon opt-${i}`}><AlertTriangle size={15} /></span>{label}<ChevronDown size={14} /></button>)}</div><div className="simulation-result"><div className="result-top"><StatusPill tone="red">Road 14 · blocked</StatusPill><span>Just now</span></div><h3>Alternate route found</h3><div className="result-stats"><div><span>Affected vehicles</span><b>8</b></div><div><span>New ETA</span><b>7h 58m</b></div><div><span>Route risk</span><b className="green-text">Low</b></div></div></div><button className="primary-button full" onClick={() => { setSimulation(false); notify('Scenario applied · vehicles rerouted') }}>Apply scenario to demo</button></div></div>}
    {toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}
  </div>
}

function ModuleView({ active, onNotify, onVehicle }: { active: string; onNotify: (s: string) => void; onVehicle: (v: Vehicle) => void }) {
  const data = active === 'Vehicles' ? vehicles : active === 'Deliveries' ? vehicles.map((v, i) => ({ ...v, vehicleNumber: `DEL-${String(i + 1001)}`, destination: ['District Hospital', 'Relief Camp · Imphal', 'PWD Depot'][i % 3] })) : incidents
  const isIncident = active === 'Incidents' || active === 'Field Reports'
  return <div className="module-view"><div className="module-hero"><div><div className="eyebrow">OPERATIONS MODULE</div><h1>{active}</h1><p>{active === 'Vehicles' ? 'Monitor fleet health, driver status, and live route progress.' : active === 'Incidents' ? 'Verify, prioritize, and resolve disruptions across the network.' : `Manage ${active.toLowerCase()} across the regional logistics network.`}</p></div><button className="primary-button" onClick={() => onNotify(`${active} workflow opened`)}><Zap size={15} /> New {active === 'Incidents' ? 'incident' : active === 'Vehicles' ? 'assignment' : 'record'}</button></div><div className="module-toolbar"><div className="map-search"><Search size={15} /><input aria-label={`Search ${active}`} placeholder={`Search ${active.toLowerCase()}...`} /></div><button className="filter-button">All statuses <ChevronDown size={13} /></button><button className="filter-button">Export <ArrowUpRight size={13} /></button></div><div className="data-table"><div className="table-header"><span>{isIncident ? 'Incident' : 'Asset'}</span><span>Location / route</span><span>Status</span><span>Risk</span><span>Last update</span><span /></div>{data.slice(0, 10).map((row, i) => <button className="table-row" key={row.id} onClick={() => 'vehicleNumber' in row ? onVehicle(row as Vehicle) : onNotify(`Opened ${row.id}`)}><span className="table-primary"><span className={`table-icon ${isIncident ? 'incident-icon' : 'vehicle-icon'}`}>{isIncident ? <AlertTriangle size={14} /> : <Truck size={14} />}</span><b>{'vehicleNumber' in row ? row.vehicleNumber : row.id}</b><small>{'vehicleNumber' in row ? row.driverName : row.type.replace('_', ' ')}</small></span><span>{'vehicleNumber' in row ? row.destination : row.location}</span><span><StatusPill tone={isIncident ? (row.severity === 'critical' ? 'red' : 'amber') : (row.status === 'delayed' ? 'amber' : 'green')}>{isIncident ? row.status : row.status.replace('_', ' ')}</StatusPill></span><span className={row.riskLevel === 'high' || row.severity === 'critical' ? 'red-text' : 'green-text'}>{'confidence' in row ? `${row.confidence}% confidence` : row.riskLevel}</span><span>{'timestamp' in row ? row.timestamp : '2 min ago'}</span><span><ArrowUpRight size={15} /></span></button>)}</div></div>
}

export { navItems }
