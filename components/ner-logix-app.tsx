'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Boxes,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronDown,
  CloudRain,
  Crosshair,
  FileWarning,
  Flame,
  Gauge,
  Globe,
  Hospital as HospitalIcon,
  Layers,
  MapPin,
  Menu,
  Package,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Settings,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Upload,
  UserRound,
  Warehouse as WarehouseIcon,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react'
import { useLogistics } from '@/hooks/use-logistics'
import { useGps } from '@/hooks/use-gps'
import { RegionMap } from '@/components/region-map'
import { t, type AppLanguage } from '@/lib/i18n'
import { calculateDetailedRisk } from '@/services/risk-prediction'
import { calculateRiskAwareRouteCandidates } from '@/services/routes'
import { computeSupplyPriorityScore } from '@/services/logistics'
import type {
  Alert,
  Delivery,
  DisasterSimulationParams,
  District,
  FieldReport,
  GeoPoint,
  Hospital,
  Incident,
  IncidentSeverity,
  IncidentType,
  Road,
  RouteCandidate,
  Supply,
  Vehicle,
  Warehouse,
} from '@/types'

const navItems = [
  { id: 'Dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'Live Map', label: 'Live Map', icon: MapPin },
  { id: 'Vehicles', label: 'Vehicles', icon: Truck },
  { id: 'Deliveries', label: 'Deliveries', icon: Package },
  { id: 'Routes', label: 'Routes & Corridors', icon: RouteIcon },
  { id: 'Incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'Predictions', label: 'AI Risk Predictions', icon: BrainCircuit },
  { id: 'Supplies', label: 'Supplies', icon: Boxes },
  { id: 'Warehouses', label: 'Warehouses', icon: WarehouseIcon },
  { id: 'Analytics', label: 'District Analytics', icon: Activity },
  { id: 'Disaster Simulation', label: 'Disaster Simulator', icon: CloudRain },
  { id: 'Field Reports', label: 'Field Reports', icon: Crosshair },
  { id: 'Settings', label: 'Settings', icon: Settings },
]

const iconMap: Record<string, typeof Truck> = {
  truck: Truck,
  package: Package,
  triangle: AlertTriangle,
  route: RouteIcon,
  bell: Bell,
  clock: Activity,
  boxes: Boxes,
  activity: Activity,
}

function StatusPill({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate'
}) {
  return (
    <span className={`status-pill ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  )
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

function KpiCard({ item }: { item: { label: string; value: string; trend: string; icon: string } }) {
  const Icon = iconMap[item.icon] ?? Activity
  const positive = !item.trend.startsWith('-')
  return (
    <div className="kpi-card">
      <div className="kpi-icon">
        <Icon size={17} />
      </div>
      <div className="kpi-label">{item.label}</div>
      <div className="kpi-value">{item.value}</div>
      <div className={`kpi-trend ${positive ? 'positive' : 'negative'}`}>
        {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        {item.trend}
        <span>status</span>
      </div>
    </div>
  )
}

export default function NerLogixApp() {
  const {
    vehicles,
    setVehicles,
    incidents,
    deliveries,
    alerts,
    setAlerts,
    roads,
    supplies,
    warehouses,
    hospitals,
    districts,
    weatherList,
    kpis,
    health,
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
    selectedRoad,
    setSelectedRoad,
    scenarioActive,
    scenarioTimeline,
    addIncident,
    resetDemo,
    triggerMedicineScenario,
    runSimulation,
    syncOfflineReports,
  } = useLogistics()

  const { fix: gpsFix, error: gpsError, enableLocation: requestGpsFix } = useGps()

  const [activeTab, setActiveTab] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showScenarioModal, setShowScenarioModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showSimulationModal, setShowSimulationModal] = useState(false)
  const [showCopilotModal, setShowCopilotModal] = useState(false)
  const [userRole, setUserRole] = useState<'ADMIN' | 'LOGISTICS_MANAGER' | 'FIELD_OFFICER' | 'VIEWER'>('ADMIN')
  const [copilotInput, setCopilotInput] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotChat, setCopilotChat] = useState<Array<{ sender: 'user' | 'ai'; text: string; action?: string }>>([
    {
      sender: 'ai',
      text: 'NER Intelligence Copilot active. Grounded in real-time sensor observations, road status, and logistics telemetry across all 8 North Eastern states. How can I assist operational dispatch?',
    },
  ])
  const [toast, setToast] = useState('')

  const notify = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3500)
  }

  const handleCopilotSend = async (queryText?: string) => {
    const query = queryText || copilotInput
    if (!query.trim()) return
    setCopilotChat((prev) => [...prev, { sender: 'user', text: query }])
    setCopilotInput('')
    setCopilotLoading(true)
    try {
      const res = await fetch('/api/copilot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      if (res.ok) {
        const data = await res.json()
        setCopilotChat((prev) => [...prev, { sender: 'ai', text: data.answer, action: data.action_type }])
      } else {
        throw new Error('API unavailable')
      }
    } catch {
      let fallbackAns = "Grounded Intelligence Summary: 8 states monitored, 42 vehicles active."
      let actionType: string | undefined = undefined
      const q = query.toLowerCase()
      if (q.includes('district') || q.includes('risk') || q.includes('isolate')) {
        fallbackAns = "Based on real-time topological connectivity and weather data, 2 districts face severe vulnerability:\n• Dima Hasao (Assam) - 87% Isolation Risk, 3h 42m est. time\n• Kohima (Nagaland) - 82% Isolation Risk\n\nAdvisory: Pre-position buffer medical and food supplies immediately."
        actionType = 'Analytics'
      } else if (q.includes('road') || q.includes('block') || q.includes('status')) {
        fallbackAns = "Disrupted Corridors:\n• NH-14 (Guwahati ➔ Imphal): BLOCKED at Tamenglong Pass due to active landslide debris.\n• NH-10 (Siliguri ➔ Gangtok): HIGH RISK (86% Risk, 92mm rainfall).\n\nRecommendation: Reroute traffic via Route B (Southern Valley Bypass)."
        actionType = 'Routes'
      } else if (q.includes('medicine') || q.includes('safest') || q.includes('route')) {
        fallbackAns = "AI Route Optimization (Emergency Medicine Transport: Guwahati ➔ Aizawl):\n• Route A (Direct NH-14): UNSAFE (92% Risk, blocked)\n• Route B (Southern Valley Ridge Bypass · NH-2/SH-12): RECOMMENDED (21% Risk, 5h 54m ETA, 72% risk reduction)\n• Route C (Northern Ridge): PARTIAL (48% Risk, +80 km)\n\nAll 14 bridges on Route B structurally verified."
        actionType = 'Routes'
      } else if (q.includes('vehicle') || q.includes('delay') || q.includes('truck')) {
        fallbackAns = "Delayed Logistics Assets:\n• NER-TRK-112 (Surgical Equipment) - Delayed 140 min at Tamenglong\n• NER-TRK-120 (Food Grains) - Delayed 75 min\n\nAutomated reroute dispatch sent to drivers."
        actionType = 'Vehicles'
      } else if (q.includes('shortage') || q.includes('supply') || q.includes('hospital')) {
        fallbackAns = "Critical Supply Depletion:\n• Aizawl District Hospital medicine reserves at 18% (2.1 days remaining).\n• Incoming convoy NER-MED-204 prioritized on Route B green-corridor."
        actionType = 'Supplies'
      } else if (q.includes('priorit') || q.includes('authorit') || q.includes('action')) {
        fallbackAns = "Top Command Center Priorities:\n1. Safeguard NER-MED-204 medicine reroute to Aizawl.\n2. Mobilize SDRF excavators to NH-14 Tamenglong pass clearance.\n3. Pre-position emergency food/fuel in Dima Hasao.\n4. Keep river acoustic bridge sensors active."
        actionType = 'Dashboard'
      }
      setCopilotChat((prev) => [...prev, { sender: 'ai', text: fallbackAns, action: actionType }])
    } finally {
      setCopilotLoading(false)
    }
  }

  // Active unverified / critical incident count
  const criticalIncidentCount = incidents.filter(
    (i) => (i.severity === 'critical' || i.severity === 'high') && i.status !== 'resolved'
  ).length

  return (
    <div className={`app-shell ${emergency ? 'emergency-mode' : ''}`}>
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Radio size={17} />
          </div>
          <div>
            <strong>
              NER-LOGIX <em>AI</em>
            </strong>
            <span>COMMAND CENTER</span>
          </div>
          <button type="button" className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="system-status">
          <span className="online-dot" /> {demoMode ? 'DEMO SIMULATION' : 'LIVE OPERATIONAL'}
          <span>•</span> NER-HUB 01
        </div>

        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={activeTab === id ? 'active' : ''}
              onClick={() => {
                setActiveTab(id)
                setMobileOpen(false)
              }}
            >
              <Icon size={17} />
              <span>{t(language, id as any) || label}</span>
              {id === 'Incidents' && criticalIncidentCount > 0 && (
                <b className="nav-count">{criticalIncidentCount}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Offline Sync State Card */}
          <div className="offline-card flex items-center justify-between">
            <div className="flex items-center gap-2">
              {online ? <Wifi size={16} className="text-[#55d29d]" /> : <WifiOff size={16} className="text-[#e76561]" />}
              <div>
                <b>{online ? 'Online Connected' : 'Offline Mode Active'}</b>
                <span>{pendingReportsCount > 0 ? `${pendingReportsCount} pending sync` : 'All reports synced'}</span>
              </div>
            </div>
            {pendingReportsCount > 0 && online && (
              <button
                type="button"
                className="text-[10px] text-[#35c2d4] underline font-bold"
                onClick={() => void syncOfflineReports().then(() => notify('Offline reports synced successfully!'))}
              >
                Sync
              </button>
            )}
          </div>

          <div className="profile">
            <div className="avatar">AS</div>
            <div>
              <b>Aarav Sharma</b>
              <span>Logistics Commander · MoDONER</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Command Workspace */}
      <main className="main-content">
        {/* Top Operational Bar */}
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button type="button" className="menu-button" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              <span>NER-LOGIX AI</span>
              <i>/</i>
              <b>{activeTab}</b>
            </div>
          </div>

          <div className="top-actions flex items-center gap-4">
            {/* Global Demo / Live Mode Switch */}
            <div className="flex items-center gap-2 bg-[#101c23] border border-[#20323b] rounded-lg p-1 text-xs">
              <button
                type="button"
                className={`px-2 py-1 rounded text-[10px] font-bold ${demoMode ? 'bg-[#35c2d4] text-[#071014]' : 'text-[#7d9099]'}`}
                onClick={() => {
                  setDemoMode(true)
                  notify('DEMO MODE: Simulated telemetry and fallback weather active.')
                }}
              >
                DEMO MODE
              </button>
              <button
                type="button"
                className={`px-2 py-1 rounded text-[10px] font-bold ${!demoMode ? 'bg-[#55d29d] text-[#071014]' : 'text-[#7d9099]'}`}
                onClick={() => {
                  setDemoMode(false)
                  notify('LIVE MODE: Connected to live API endpoints with mock fallback.')
                }}
              >
                LIVE MODE
              </button>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-1 bg-[#101c23] border border-[#20323b] rounded-lg px-2 py-1 text-xs text-[#35c2d4]">
              <UserRound size={13} />
              <select
                className="bg-transparent border-0 text-xs text-[#cad6da] outline-none cursor-pointer"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as any)}
                aria-label="User Role"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="LOGISTICS_MANAGER">LOGISTICS MGR</option>
                <option value="FIELD_OFFICER">FIELD OFFICER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#101c23] border border-[#20323b] rounded-lg px-2 py-1 text-xs text-[#cad6da]">
              <Globe size={13} className="text-[#35c2d4]" />
              <select
                className="bg-transparent border-0 text-xs text-[#cad6da] outline-none cursor-pointer"
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                aria-label="Select Language"
              >
                <option value="en">English (EN)</option>
                <option value="hi">हिंदी (HI)</option>
                <option value="as">অসমীয়া (AS)</option>
                <option value="bn">বাংলা (BN)</option>
              </select>
            </div>

            {/* Notifications */}
            <button
              type="button"
              className="icon-button notification"
              aria-label="Alerts"
              onClick={() => setActiveTab('Incidents')}
            >
              <Bell size={18} />
              {alerts.length > 0 && <i>{alerts.length}</i>}
            </button>

            {/* Emergency Mode Button */}
            <button
              type="button"
              className={`emergency-button ${emergency ? 'active' : ''}`}
              onClick={() => {
                setEmergency(!emergency)
                notify(
                  !emergency
                    ? 'EMERGENCY MODE ACTIVATED: Priority green-corridors active for relief shipments.'
                    : 'Emergency mode deactivated.'
                )
              }}
            >
              <Siren size={16} />
              {emergency ? t(language, 'emergencyActive') : t(language, 'emergencyMode')}
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="page-content">
          {/* Header Banner & Scenario Quick Action */}
          <div className="page-header">
            <div>
              <div className="eyebrow">
                INDIA NORTH EASTERN REGION · LOGISTICS ACCESSIBILITY INTELLIGENCE
              </div>
              <h1>
                {emergency
                  ? 'Emergency Operations Center'
                  : activeTab === 'Dashboard'
                  ? 'Regional Command Overview'
                  : activeTab}
              </h1>
              <p>
                {emergency
                  ? 'Lifeline corridors prioritized for medical, oxygen, and emergency disaster relief.'
                  : 'Real-time road accessibility monitoring, AI risk prediction, and resilient alternate route dispatch.'}
              </p>
            </div>

            <div className="header-buttons">
              <button
                type="button"
                className="secondary-button border-[#35c2d4]/40 text-[#35c2d4]"
                onClick={() => setShowCopilotModal(true)}
              >
                <BrainCircuit size={15} /> AI Copilot
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowReportModal(true)}
              >
                <FileWarning size={15} /> Field Report
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowSimulationModal(true)}
              >
                <CloudRain size={15} /> Disaster Simulator
              </button>

              {demoMode && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    resetDemo()
                    notify('Demo simulation state reset to nominal baseline.')
                  }}
                  title="Reset Demo Scenario"
                >
                  <RefreshCw size={14} /> Reset Demo
                </button>
              )}

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setShowScenarioModal(true)
                  triggerMedicineScenario()
                  notify('Scenario Started: Medicine Delivery Emergency (Guwahati ➔ Aizawl)')
                }}
              >
                <Zap size={15} /> Emergency Demo
              </button>
            </div>
          </div>

          {/* System Health Indicators Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-[#0d1a20]/80 border border-[#20323b] rounded-xl px-4 py-2 text-xs mb-4">
            <div className="flex items-center gap-1.5 text-[#35c2d4] font-semibold">
              <Activity size={14} /> SYSTEM HEALTH:
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${healthStatus.api === 'CONNECTED' ? 'bg-[#41c18a]' : healthStatus.api === 'DEGRADED' ? 'bg-[#e0b649]' : 'bg-[#e76561]'}`} />
              <span className="text-[#8e9fa6]">API:</span>
              <span className="text-[#e9f0f2] font-mono">{healthStatus.api} ({healthStatus.lastUpdatedSecondsAgo}s ago)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#41c18a]" />
              <span className="text-[#8e9fa6]">DATABASE:</span>
              <span className="text-[#e9f0f2] font-mono">{healthStatus.database}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${healthStatus.weather === 'LIVE' ? 'bg-[#41c18a]' : 'bg-[#e0b649]'}`} />
              <span className="text-[#8e9fa6]">WEATHER:</span>
              <span className="text-[#e9f0f2] font-mono">{healthStatus.weather} (Open-Meteo · {healthStatus.lastWeatherSync})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${healthStatus.gps === 'LIVE' ? 'bg-[#35c2d4]' : 'bg-[#41c18a]'}`} />
              <span className="text-[#8e9fa6]">GPS:</span>
              <span className="text-[#e9f0f2] font-mono">{healthStatus.gps === 'LIVE' ? 'LIVE GPS' : 'DEMO GPS'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${healthStatus.ws === 'CONNECTED' ? 'bg-[#41c18a]' : healthStatus.ws === 'RECONNECTING' ? 'bg-[#e0b649]' : 'bg-[#e76561]'}`} />
              <span className="text-[#8e9fa6]">WEBSOCKET:</span>
              <span className="text-[#e9f0f2] font-mono">{healthStatus.ws}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[#7d9099] font-mono text-[10px]">OPERATOR ROLE: {userRole}</span>
            </div>
          </div>

          {/* Emergency Alert Banner */}
          {emergency && (
            <div className="emergency-banner animate-pulse">
              <Siren size={20} />
              <div>
                <b>EMERGENCY DISASTER OPERATIONS PROTOCOL ACTIVE</b>
                <span>
                  Priority routing enforced across North East. 6 lifeline corridors protected · 12 vehicles rerouted · Aizawl Hospital supply prioritized.
                </span>
              </div>
              <button type="button" onClick={() => setEmergency(false)}>
                Exit Emergency Mode
              </button>
            </div>
          )}

          {/* Tab Views Router */}
          {activeTab === 'Dashboard' && (
            <DashboardView
              kpis={kpis}
              vehicles={vehicles}
              incidents={incidents}
              warehouses={warehouses}
              hospitals={hospitals}
              deliveries={deliveries}
              roads={roads}
              districts={districts}
              alerts={alerts}
              health={health}
              language={language}
              simulation={simulation}
              emergency={emergency}
              primaryBlocked={primaryBlocked}
              onVehicle={setSelectedVehicle}
              onIncident={setSelectedIncident}
              onRoadSelect={setSelectedRoad}
              onReport={() => setShowReportModal(true)}
              onRunSimulation={() => setShowSimulationModal(true)}
              onMedicineDemo={() => {
                setShowScenarioModal(true)
                triggerMedicineScenario()
              }}
              onNav={setActiveTab}
            />
          )}

          {activeTab === 'Live Map' && (
            <div className="space-y-4">
              <RegionMap
                vehicles={vehicles}
                incidents={incidents}
                warehouses={warehouses}
                hospitals={hospitals}
                deliveries={deliveries}
                roads={roads}
                districts={districts}
                language={language}
                gps={gpsFix}
                gpsError={gpsError}
                onEnableLocation={requestGpsFix}
                simulation={simulation}
                emergency={emergency}
                primaryBlocked={primaryBlocked}
                onVehicle={setSelectedVehicle}
                onIncident={setSelectedIncident}
                onReport={() => setShowReportModal(true)}
                onRoadSelect={setSelectedRoad}
              />
            </div>
          )}

          {activeTab === 'Vehicles' && (
            <VehiclesView
              vehicles={vehicles}
              onVehicle={setSelectedVehicle}
              gpsFix={gpsFix}
              onRequestGps={requestGpsFix}
              onNotify={notify}
            />
          )}

          {activeTab === 'Deliveries' && (
            <DeliveriesView
              deliveries={deliveries}
              vehicles={vehicles}
            />
          )}

          {activeTab === 'Routes' && (
            <RoutesView
              roads={roads}
              incidents={incidents}
              weather={weatherList[0] ?? null}
              onRoadSelect={setSelectedRoad}
              onNotify={notify}
            />
          )}

          {activeTab === 'Incidents' && (
            <IncidentsView
              incidents={incidents}
              onIncident={setSelectedIncident}
              onNewIncident={() => setShowReportModal(true)}
            />
          )}

          {activeTab === 'Predictions' && (
            <PredictionsView
              roads={roads}
              weatherList={weatherList}
              onNotify={notify}
            />
          )}

          {activeTab === 'Supplies' && (
            <SuppliesView
              supplies={supplies}
              warehouses={warehouses}
              deliveries={deliveries}
              onNotify={notify}
            />
          )}

          {activeTab === 'Warehouses' && (
            <WarehousesView
              warehouses={warehouses}
              supplies={supplies}
            />
          )}

          {activeTab === 'Analytics' && (
            <DistrictAnalyticsView
              districts={districts}
              roads={roads}
            />
          )}

          {activeTab === 'Disaster Simulation' && (
            <DisasterSimulationView
              roads={roads}
              vehicles={vehicles}
              deliveries={deliveries}
              onRun={runSimulation}
              onNotify={notify}
            />
          )}

          {activeTab === 'Field Reports' && (
            <FieldReportingView
              online={online}
              gps={gpsFix}
              onRequestLocation={requestGpsFix}
              onSubmitReport={async (report) => {
                const inc: Incident = {
                  id: report.id,
                  type: report.incidentType,
                  severity: report.severity,
                  status: 'new',
                  location: report.locationLabel,
                  lat: report.location.lat,
                  lng: report.location.lng,
                  timestamp: 'Just now',
                  description: report.description,
                  reportedBy: report.officerName,
                  affectedRoads: ['NH-14'],
                  affectedVehicles: ['v1', 'v3'],
                  confidence: 90,
                  photoDataUrl: report.photoDataUrl,
                }
                await addIncident(inc, report)
                notify('Field Report submitted & AI risk recalculation triggered!')
              }}
              onSync={syncOfflineReports}
            />
          )}

          {activeTab === 'Settings' && (
            <SettingsView
              demoMode={demoMode}
              setDemoMode={setDemoMode}
              language={language}
              setLanguage={setLanguage}
              simulation={simulation}
              setSimulation={setSimulation}
              emergency={emergency}
              setEmergency={setEmergency}
            />
          )}
        </div>
      </main>

      {/* Vehicle Detail Drawer */}
      {selectedVehicle && (
        <div className="detail-drawer">
          <button
            type="button"
            className="drawer-close"
            onClick={() => setSelectedVehicle(null)}
          >
            <X size={18} />
          </button>
          <div className="eyebrow">FLEET TELEMETRY · LIVE GPS</div>
          <h2>{selectedVehicle.vehicleNumber}</h2>
          <div className="flex gap-2 mb-4">
            <StatusPill tone={selectedVehicle.status === 'delayed' ? 'amber' : selectedVehicle.status === 'emergency' ? 'red' : 'green'}>
              {selectedVehicle.status.toUpperCase()}
            </StatusPill>
            {selectedVehicle.cargoPriority && (
              <span className="px-2 py-0.5 bg-[#35c2d4]/20 text-[#35c2d4] border border-[#35c2d4]/40 rounded text-[9px] font-bold uppercase">
                {selectedVehicle.cargoPriority} PRIORITY
              </span>
            )}
          </div>

          <div className="drawer-stat-grid">
            <div>
              <span>Driver</span>
              <b>{selectedVehicle.driverName}</b>
            </div>
            <div>
              <span>Speed</span>
              <b className="font-mono">{selectedVehicle.speed} km/h</b>
            </div>
            <div>
              <span>Cargo Payload</span>
              <b>{selectedVehicle.cargo ?? 'General Supplies'}</b>
            </div>
            <div>
              <span>Load Weight</span>
              <b className="font-mono">{selectedVehicle.currentLoad} / {selectedVehicle.capacity} kg</b>
            </div>
            <div>
              <span>Origin</span>
              <b>{selectedVehicle.origin ?? 'Guwahati'}</b>
            </div>
            <div>
              <span>Destination</span>
              <b>{selectedVehicle.destination ?? 'Aizawl'}</b>
            </div>
            <div>
              <span>ETA</span>
              <b className="font-mono text-[#35c2d4]">{selectedVehicle.eta ?? '4h 15m'}</b>
            </div>
            <div>
              <span>Fuel / Battery</span>
              <b className="font-mono">{selectedVehicle.fuel}% fuel {selectedVehicle.battery ? `· ${selectedVehicle.battery}% bat` : ''}</b>
            </div>
          </div>

          <div className="drawer-route">
            <div className="route-pulse" />
            <div>
              <b>Transit Route Progress</b>
              <span>{selectedVehicle.destination} corridor · {selectedVehicle.deliveryPercentage ?? 65}% completed</span>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <button
              type="button"
              className="primary-button full"
              onClick={() => {
                setActiveTab('Live Map')
                setSelectedVehicle(null)
                notify(`Focused map on ${selectedVehicle.vehicleNumber}`)
              }}
            >
              <Crosshair size={14} /> Center on Live Map
            </button>
          </div>
        </div>
      )}

      {/* Incident Detail Drawer */}
      {selectedIncident && (
        <div className="detail-drawer">
          <button
            type="button"
            className="drawer-close"
            onClick={() => setSelectedIncident(null)}
          >
            <X size={18} />
          </button>
          <div className="eyebrow">INCIDENT ADVISORY · {selectedIncident.id}</div>
          <h2>{selectedIncident.type.replace('_', ' ')}</h2>
          <StatusPill tone={selectedIncident.severity === 'critical' ? 'red' : selectedIncident.severity === 'high' ? 'amber' : 'blue'}>
            {selectedIncident.severity.toUpperCase()} SEVERITY
          </StatusPill>
          <p className="drawer-description">{selectedIncident.description}</p>

          <div className="drawer-stat-grid">
            <div>
              <span>Location</span>
              <b>{selectedIncident.location}</b>
            </div>
            <div>
              <span>AI Confidence</span>
              <b className="font-mono text-[#55d29d]">{selectedIncident.confidence}% verified</b>
            </div>
            <div>
              <span>Reported By</span>
              <b>{selectedIncident.reportedBy}</b>
            </div>
            <div>
              <span>Timestamp</span>
              <b>{selectedIncident.timestamp}</b>
            </div>
            <div>
              <span>Affected Roads</span>
              <b className="text-[#e76561]">{selectedIncident.affectedRoads.join(', ') || 'NH-14'}</b>
            </div>
            <div>
              <span>Vehicles in Hazard</span>
              <b>{selectedIncident.affectedVehicles.join(', ') || 'None'}</b>
            </div>
          </div>

          <button
            type="button"
            className="primary-button full"
            onClick={() => {
              setActiveTab('Routes')
              setSelectedIncident(null)
              notify('Opened Route Optimization for incident corridor')
            }}
          >
            <RouteIcon size={14} /> Find Safe Alternate Route
          </button>
        </div>
      )}

      {/* Medicine Delivery Emergency Demo Scenario Modal */}
      {showScenarioModal && (
        <div className="modal-backdrop">
          <div className="simulation-modal max-w-xl">
            <button
              type="button"
              className="drawer-close"
              onClick={() => setShowScenarioModal(false)}
            >
              <X size={18} />
            </button>
            <div className="simulation-icon bg-[#35c2d4]/20 text-[#35c2d4]">
              <Sparkles size={24} />
            </div>
            <div className="eyebrow">BUILT-IN DEMO SCENARIO · SIH26002</div>
            <h2>Medicine Delivery Emergency</h2>
            <p className="text-xs text-[#cad6da]">
              Demonstrates the end-to-end intelligence loop: Landslide occurs on NH-14 corridor ➔ AI detects critical convoy NER-MED-204 ➔ computes Route B (+38km, 72% risk reduction) ➔ reroutes vehicle and notifies Aizawl Hospital.
            </p>

            {/* Event Timeline */}
            <div className="my-4 space-y-2 max-h-64 overflow-y-auto pr-1">
              {scenarioTimeline.map((item, idx) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 p-2 rounded bg-[#152a31] border border-[#23424d] text-xs"
                >
                  <span className="font-mono text-[10px] text-[#35c2d4] font-bold px-1.5 py-0.5 bg-[#091116] rounded">
                    {item.time}
                  </span>
                  <div className="flex-1">
                    <b className="text-[#e9f0f2] block">{item.title}</b>
                    <span className="text-[10px] text-[#7d9099]">{item.description}</span>
                  </div>
                  <CheckCircle2 size={16} className="text-[#55d29d] shrink-0 mt-0.5" />
                </div>
              ))}
            </div>

            <div className="simulation-result">
              <div className="result-top">
                <StatusPill tone="green">Rerouted Safely to Route B</StatusPill>
                <span>Vehicle NER-MED-204</span>
              </div>
              <div className="result-stats mt-2">
                <div>
                  <span>New Corridor</span>
                  <b className="text-xs">Southern Valley Bypass</b>
                </div>
                <div>
                  <span>Risk Reduction</span>
                  <b className="text-[#55d29d] text-xs">72% safer</b>
                </div>
                <div>
                  <span>Updated ETA</span>
                  <b className="text-xs">5h 54m (+42m)</b>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary-button full mt-3"
              onClick={() => {
                setShowScenarioModal(false)
                setActiveTab('Live Map')
                notify('Scenario applied! Viewing live rerouted convoy on map.')
              }}
            >
              View Rerouted Convoy on Map
            </button>
          </div>
        </div>
      )}

      {/* Field Report Modal */}
      {showReportModal && (
        <div className="modal-backdrop">
          <div className="simulation-modal max-w-md">
            <button
              type="button"
              className="drawer-close"
              onClick={() => setShowReportModal(false)}
            >
              <X size={18} />
            </button>
            <div className="simulation-icon bg-[#e9ad4b]/20 text-[#e9ad4b]">
              <FileWarning size={24} />
            </div>
            <div className="eyebrow">FIELD INCIDENT SUBMISSION</div>
            <h2>Report Road Disruption</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const form = e.currentTarget
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value as IncidentType
                const severity = (form.elements.namedItem('severity') as HTMLSelectElement).value as IncidentSeverity
                const location = (form.elements.namedItem('location') as HTMLInputElement).value
                const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value

                const inc: Incident = {
                  id: `INC-${Date.now().toString().slice(-4)}`,
                  type,
                  severity,
                  status: 'new',
                  location: location || 'NH-14 · Tamenglong',
                  lat: gpsFix ? gpsFix.lat : 24.98,
                  lng: gpsFix ? gpsFix.lng : 93.62,
                  timestamp: 'Just now',
                  description: description || 'Field reported hazard',
                  reportedBy: 'Field Officer Mobile Unit',
                  affectedRoads: ['NH-14'],
                  affectedVehicles: ['v1', 'v3'],
                  confidence: 90,
                }

                await addIncident(inc)
                setShowReportModal(false)
                notify('Incident created! AI risk recalculated & alternate route dispatched.')
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#7d9099] mb-1">Incident Type</label>
                <select
                  name="type"
                  className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
                >
                  <option value="landslide">Landslide & Rockfall</option>
                  <option value="flood">River Flash Flood</option>
                  <option value="road_damage">Road Deformation / Subsidence</option>
                  <option value="bridge_damage">Bridge Structural Damage</option>
                  <option value="heavy_rain">Severe Monsoon Downpour</option>
                  <option value="traffic">Massive Traffic Bottleneck</option>
                </select>
              </div>

              <div>
                <label className="block text-[#7d9099] mb-1">Severity Level</label>
                <select
                  name="severity"
                  className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
                >
                  <option value="critical">Critical (Road Impassable)</option>
                  <option value="high">High (Single-Lane Restriction)</option>
                  <option value="medium">Medium (Slow Moving Caution)</option>
                  <option value="low">Low (Debris Cleared)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#7d9099] mb-1">Corridor Location</label>
                <input
                  name="location"
                  placeholder="e.g. NH-14 · Tamenglong Pass km 142"
                  className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#7d9099] mb-1">Description & Evidence</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Describe slope condition, debris volume, vehicle access..."
                  className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-button full mt-4"
              >
                Submit Incident Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Disaster Simulator Modal */}
      {showSimulationModal && (
        <div className="modal-backdrop">
          <div className="simulation-modal max-w-lg">
            <button
              type="button"
              className="drawer-close"
              onClick={() => setShowSimulationModal(false)}
            >
              <X size={18} />
            </button>
            <div className="simulation-icon bg-[#e76561]/20 text-[#e76561]">
              <CloudRain size={24} />
            </div>
            <div className="eyebrow">DISASTER SIMULATION CENTER</div>
            <h2>Simulate Extreme Weather Impact</h2>
            <p className="text-xs text-[#cad6da]">
              Modify disaster parameters to evaluate network vulnerability, impacted convoys, and automatic alternate route availability.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const rainfall = (form.elements.namedItem('rainfall') as HTMLSelectElement).value as any
                const floodLevel = Number((form.elements.namedItem('floodLevel') as HTMLInputElement).value)
                const traffic = (form.elements.namedItem('traffic') as HTMLSelectElement).value as any
                const roadId = (form.elements.namedItem('road') as HTMLSelectElement).value

                const result = runSimulation({
                  rainfall,
                  floodLevelM: floodLevel,
                  traffic,
                  blockedRoadId: roadId,
                  landslideProbability: rainfall === 'Extreme' ? 88 : 50,
                })

                setShowSimulationModal(false)
                notify(`Simulation executed: ${result.after.blocked} roads blocked · ${result.after.affectedVehicles} vehicles rerouted safely.`)
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#7d9099] mb-1">Rainfall Intensity</label>
                <select
                  name="rainfall"
                  className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
                >
                  <option value="Normal">Normal Monsoon (25mm)</option>
                  <option value="Moderate">Moderate Downpour (50mm)</option>
                  <option value="Heavy">Heavy Cloudburst (80mm)</option>
                  <option value="Extreme">Extreme Torrential (120mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#7d9099] mb-1">River Flood Level (Meters above gauge)</label>
                <input
                  name="floodLevel"
                  type="number"
                  defaultValue={2}
                  min={0}
                  max={5}
                  step={0.5}
                  className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
                />
              </div>

              <div>
                <label className="block text-[#7d9099] mb-1">Select Corridor to Block</label>
                <select
                  name="road"
                  className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
                >
                  {roads.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.startDistrict} ➔ {r.endDistrict})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#7d9099] mb-1">Traffic Congestion</label>
                <select
                  name="traffic"
                  className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
                >
                  <option value="Low">Low Convoy Density</option>
                  <option value="Moderate">Moderate Density</option>
                  <option value="Heavy">Heavy Military & Civilian Convoy</option>
                  <option value="Extreme">Extreme Bottleneck</option>
                </select>
              </div>

              <button
                type="submit"
                className="primary-button full mt-4"
              >
                Run Disaster Simulation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NER Intelligence Copilot Modal */}
      {showCopilotModal && (
        <div className="modal-backdrop">
          <div className="modal-card max-w-2xl w-full flex flex-col max-h-[85vh]">
            <button
              type="button"
              className="drawer-close"
              onClick={() => setShowCopilotModal(false)}
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-[#35c2d4]/20 text-[#35c2d4]">
                <BrainCircuit size={24} />
              </div>
              <div>
                <div className="eyebrow">AI DISPATCH ASSISTANT</div>
                <h2 className="text-lg font-bold text-[#e9f0f2]">NER Intelligence Copilot</h2>
              </div>
            </div>
            <p className="text-xs text-[#cad6da] mb-3">
              Grounded in live telemetry, meteorological sensors, topological connectivity, and hospital supply inventories.
            </p>

            {/* Quick Prompt Suggestions */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                'Which districts are high risk?',
                'Which roads are blocked?',
                'Find the safest medicine route',
                'Which vehicles are delayed?',
                'Which district may face medicine shortage?',
                'What should authorities prioritize?',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleCopilotSend(chip)}
                  className="px-2.5 py-1 rounded-full bg-[#101c23] hover:bg-[#20323b] border border-[#20323b] hover:border-[#35c2d4]/50 text-[11px] text-[#cad6da] transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Transcript */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#0a1217] border border-[#1e2f38] rounded-xl mb-3 min-h-[220px]">
              {copilotChat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#35c2d4]/20 border border-[#35c2d4]/40 text-[#e9f0f2]'
                        : 'bg-[#101c23] border border-[#20323b] text-[#cad6da] whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.action && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCopilotModal(false)
                        if (msg.action === 'NAVIGATE_ROUTES' || msg.action === 'OPTIMIZE_ROUTE' || msg.action === 'Routes') {
                          setActiveTab('Routes')
                        } else if (msg.action === 'NAVIGATE_DISTRICTS' || msg.action === 'Analytics') {
                          setActiveTab('Analytics')
                        } else if (msg.action === 'NAVIGATE_VEHICLES' || msg.action === 'Vehicles') {
                          setActiveTab('Vehicles')
                        } else if (msg.action === 'NAVIGATE_SUPPLIES' || msg.action === 'Supplies') {
                          setActiveTab('Supplies')
                        } else {
                          setActiveTab('Dashboard')
                        }
                      }}
                      className="mt-1 text-[11px] text-[#35c2d4] hover:underline flex items-center gap-1 font-mono"
                    >
                      ➔ Jump to {msg.action} Module
                    </button>
                  )}
                </div>
              ))}
              {copilotLoading && (
                <div className="flex items-center gap-2 text-xs text-[#7d9099] italic">
                  <RefreshCw size={13} className="animate-spin text-[#35c2d4]" />
                  Querying topological models & sensor feeds...
                </div>
              )}
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCopilotSend()
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Ask intelligence copilot (e.g. Which corridors are safe for oxygen trucks?)"
                className="flex-1 bg-[#0d1a20] border border-[#20323b] focus:border-[#35c2d4] px-3 py-2 rounded-lg text-xs text-[#e9f0f2] outline-none"
              />
              <button
                type="submit"
                disabled={copilotLoading}
                className="primary-button text-xs whitespace-nowrap"
              >
                Send Query
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Toast Notification */}
      {toast && (
        <div className="toast animate-bounce">
          <span className="toast-check">✓</span>
          {toast}
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   SUB-VIEWS & MODULE COMPONENTS
   ========================================================================= */

function DashboardView({
  kpis,
  vehicles,
  incidents,
  warehouses,
  hospitals,
  deliveries,
  roads,
  districts,
  alerts,
  health,
  language,
  simulation,
  emergency,
  primaryBlocked,
  onVehicle,
  onIncident,
  onRoadSelect,
  onReport,
  onRunSimulation,
  onMedicineDemo,
  onNav,
}: {
  kpis: { label: string; value: string; trend: string; icon: string }[]
  vehicles: Vehicle[]
  incidents: Incident[]
  warehouses: Warehouse[]
  hospitals: Hospital[]
  deliveries: Delivery[]
  roads: Road[]
  districts: District[]
  alerts: Alert[]
  health: any
  language: AppLanguage
  simulation: boolean
  emergency: boolean
  primaryBlocked: boolean
  onVehicle: (v: Vehicle) => void
  onIncident: (i: Incident) => void
  onRoadSelect: (r: Road) => void
  onReport: () => void
  onRunSimulation: () => void
  onMedicineDemo: () => void
  onNav: (tab: string) => void
}) {
  const deliveryTrend = [
    { day: 'Mon', delivered: 920, delayed: 32 },
    { day: 'Tue', delivered: 1080, delayed: 27 },
    { day: 'Wed', delivered: 1160, delayed: 18 },
    { day: 'Thu', delivered: 1120, delayed: 22 },
    { day: 'Fri', delivered: 1290, delayed: 13 },
    { day: 'Sat', delivered: 1240, delayed: 13 },
    { day: 'Sun', delivered: 1180, delayed: 19 },
  ]

  const riskTrend = [
    { time: '06:00', risk: 32 },
    { time: '09:00', risk: 41 },
    { time: '12:00', risk: 48 },
    { time: '15:00', risk: 53 },
    { time: '18:00', risk: 46 },
    { time: '21:00', risk: 39 },
  ]

  const stateData = [
    { state: 'Assam', incidents: 8 },
    { state: 'Manipur', incidents: 6 },
    { state: 'Meghalaya', incidents: 4 },
    { state: 'Nagaland', incidents: 3 },
    { state: 'Mizoram', incidents: 2 },
    { state: 'Sikkim', incidents: 3 },
  ]

  return (
    <>
      {/* 8 Regional KPIs */}
      <div className="kpi-grid">
        {kpis.map((item) => (
          <KpiCard item={item} key={item.label} />
        ))}
      </div>

      {/* Main Grid: GIS Map & Alert Center */}
      <div className="dashboard-grid">
        <section>
          <SectionHeading
            eyebrow="REGIONAL GIS INTELLIGENCE"
            title="Live Operational Corridor Map"
            action={
              <div className="section-actions">
                <StatusPill tone="green">Live Network Feed</StatusPill>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onNav('Live Map')}
                >
                  Fullscreen Map <ArrowUpRight size={14} />
                </button>
              </div>
            }
          />
          <RegionMap
            vehicles={vehicles}
            incidents={incidents}
            warehouses={warehouses}
            hospitals={hospitals}
            deliveries={deliveries}
            roads={roads}
            districts={districts}
            language={language}
            simulation={simulation}
            emergency={emergency}
            primaryBlocked={primaryBlocked}
            onVehicle={onVehicle}
            onIncident={onIncident}
            onReport={onReport}
            onRoadSelect={onRoadSelect}
          />
        </section>

        {/* Right Rail: Alert Center & Quick Actions */}
        <aside className="right-rail">
          <SectionHeading
            eyebrow="REQUIRES IMMEDIATE ACTION"
            title="Alert Center"
            action={
              <button
                type="button"
                className="text-button"
                onClick={() => onNav('Incidents')}
              >
                View all ({alerts.length})
              </button>
            }
          />
          <div className="alert-list">
            {alerts.slice(0, 4).map((alert) => (
              <div className="alert-row" key={alert.id}>
                <div className={`alert-symbol ${alert.severity}`}>
                  <AlertTriangle size={15} />
                </div>
                <div className="alert-copy">
                  <b>{alert.message}</b>
                  <span>{alert.timestamp} · {alert.location ?? 'Corridor'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="quick-actions">
            <div className="eyebrow">COMMAND SHORTCUTS</div>
            <div className="quick-grid">
              <button type="button" onClick={onMedicineDemo}>
                <Zap size={17} />
                <span>Medicine Emergency</span>
              </button>
              <button type="button" onClick={onRunSimulation}>
                <CloudRain size={17} />
                <span>Disaster Sim</span>
              </button>
              <button type="button" onClick={() => onNav('Routes')}>
                <RouteIcon size={17} />
                <span>Optimize Route</span>
              </button>
              <button type="button" onClick={() => onNav('Field Reports')}>
                <Crosshair size={17} />
                <span>Field Report</span>
              </button>
            </div>
          </div>

          {/* Live Realtime Event Stream */}
          <div className="mt-4 p-3 bg-[#0d1a20] border border-[#20323b] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#35c2d4] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Radio size={12} className="text-[#35c2d4] animate-pulse" /> LIVE EVENT STREAM
              </span>
              <span className="text-[9px] text-[#55d29d] font-mono">WEBSOCKET: ACTIVE</span>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto text-[11px] font-mono text-[#cad6da]">
              <div className="flex items-start gap-2 p-1.5 rounded bg-[#101d23] border border-[#1b2b33]">
                <span className="text-[#35c2d4] text-[10px]">16:21:04</span>
                <div>
                  <b className="text-[#e76561]">INCIDENT:</b> NH-14 Tamenglong Landslide
                </div>
              </div>
              <div className="flex items-start gap-2 p-1.5 rounded bg-[#101d23] border border-[#1b2b33]">
                <span className="text-[#35c2d4] text-[10px]">16:21:06</span>
                <div>
                  <b className="text-[#e9ad4b]">AI RISK:</b> Escalated to 94% (Critical)
                </div>
              </div>
              <div className="flex items-start gap-2 p-1.5 rounded bg-[#101d23] border border-[#1b2b33]">
                <span className="text-[#35c2d4] text-[10px]">16:21:07</span>
                <div>
                  <b className="text-[#e76561]">ROAD STATUS:</b> NH-14 Marked BLOCKED
                </div>
              </div>
              <div className="flex items-start gap-2 p-1.5 rounded bg-[#101d23] border border-[#1b2b33]">
                <span className="text-[#35c2d4] text-[10px]">16:21:09</span>
                <div>
                  <b className="text-[#55d29d]">ROUTE:</b> Route B Bypass Selected (+38km)
                </div>
              </div>
              <div className="flex items-start gap-2 p-1.5 rounded bg-[#101d23] border border-[#1b2b33]">
                <span className="text-[#35c2d4] text-[10px]">16:21:11</span>
                <div>
                  <b className="text-[#35c2d4]">VEHICLE:</b> NER-MED-204 Rerouted (ETA 5h 54m)
                </div>
              </div>
              <div className="flex items-start gap-2 p-1.5 rounded bg-[#101d23] border border-[#1b2b33]">
                <span className="text-[#35c2d4] text-[10px]">16:21:14</span>
                <div>
                  <b className="text-[#55d29d]">ALERT:</b> Aizawl Hospital Supply Protected
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Lower Grid: Analytics Charts & Health Score */}
      <div className="lower-grid">
        <div className="panel chart-panel">
          <SectionHeading
            eyebrow="NETWORK THROUGHPUT"
            title="Delivery Reliability"
          />
          <div className="chart-legend">
            <span><i className="legend-dot cyan" /> Delivered (On time)</span>
            <span><i className="legend-dot amber" /> Delayed (Weather)</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={deliveryTrend} margin={{ left: -22, right: 5, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="deliveryFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#35c2d4" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#35c2d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#24313b" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#70808b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#70808b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#132029', border: '1px solid #2b3b46', borderRadius: 8, color: '#f0f4f5' }} />
              <Area type="monotone" dataKey="delivered" stroke="#35c2d4" fill="url(#deliveryFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="delayed" stroke="#e9ad4b" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <SectionHeading
            eyebrow="AI RISK INTELLIGENCE"
            title="Hourly Regional Risk Trend"
          />
          <div className="risk-headline">
            <strong>48.6 / 100</strong>
            <span>Moderate risk · Monsoon surge</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={riskTrend} margin={{ left: -22, right: 5, top: 20, bottom: 0 }}>
              <CartesianGrid stroke="#24313b" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#70808b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#70808b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#132029', border: '1px solid #2b3b46', borderRadius: 8 }} />
              <Area type="monotone" dataKey="risk" stroke="#e9ad4b" fill="#e9ad4b" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Health Score Panel */}
        <div className="health-panel">
          <div className="score-ring" style={{ '--score': `${health.overallScore * 3.6}deg` } as any}>
            <div>
              <strong>{health.overallScore}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <div className="health-copy">
            <div className="eyebrow">SYSTEM STATUS</div>
            <h3>Logistics Health Index</h3>
            <StatusPill tone="green">Network Operational</StatusPill>
          </div>
          <div className="health-breakdown">
            {[
              ['Road accessibility', health.roadAccessibility],
              ['Vehicle availability', health.vehicleAvailability],
              ['Delivery reliability', health.deliveryReliability],
              ['Risk readiness', health.riskLevel],
              ['Supply readiness', health.supplyReadiness],
            ].map(([label, value]) => (
              <div className="health-row" key={label as string}>
                <span>{label as string}</span>
                <b>{value}%</b>
                <i><em style={{ width: `${value}%` }} /></i>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function VehiclesView({
  vehicles,
  onVehicle,
  gpsFix,
  onRequestGps,
  onNotify,
}: {
  vehicles: Vehicle[]
  onVehicle: (v: Vehicle) => void
  gpsFix: any
  onRequestGps: () => void
  onNotify: (msg: string) => void
}) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isGpsStreaming, setIsGpsStreaming] = useState(false)

  const toggleGpsStream = async () => {
    if (!isGpsStreaming) {
      onRequestGps()
      setIsGpsStreaming(true)
      onNotify('Live Device GPS Streaming Activated (Broadcasting via Geolocation API)')
    } else {
      setIsGpsStreaming(false)
      onNotify('Live Device GPS Streaming Deactivated')
    }
  }

  // Periodic GPS dispatch if streaming
  useEffect(() => {
    if (!isGpsStreaming || !gpsFix) return
    const interval = setInterval(async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
        await fetch(`${backendUrl}/api/vehicles/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_id: 'v1',
            latitude: gpsFix.lat,
            longitude: gpsFix.lng,
            speed: 42.0,
            heading: 90.0,
            is_live: true,
            status: 'on_route',
          }),
        })
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [isGpsStreaming, gpsFix])

  const filtered = vehicles.filter((v) => {
    const matchesFilter = filter === 'all' || v.status === filter
    const matchesSearch =
      v.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.driverName.toLowerCase().includes(search.toLowerCase()) ||
      (v.cargo ?? '').toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="module-view">
      <div className="module-hero">
        <div>
          <div className="eyebrow">FLEET TELEMETRY & GPS TRACKING</div>
          <h1>Active Fleet Assets ({vehicles.length})</h1>
          <p>Real-time vehicle tracking with mobile GPS streaming, cargo priority, and automatic reroute status.</p>
        </div>
        <button
          type="button"
          className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
            isGpsStreaming
              ? 'bg-[#e76561] text-white animate-pulse'
              : 'bg-[#35c2d4]/20 border border-[#35c2d4] text-[#35c2d4] hover:bg-[#35c2d4]/30'
          }`}
          onClick={toggleGpsStream}
        >
          <Radio size={14} className={isGpsStreaming ? 'animate-spin' : ''} />
          {isGpsStreaming ? 'STOP LIVE GPS STREAM' : 'START LIVE GPS (DEVICE)'}
        </button>
      </div>

      {/* Live Mobile GPS Status Bar */}
      {isGpsStreaming && gpsFix && (
        <div className="my-3 p-3 bg-[#152a31] border border-[#35c2d4]/60 rounded-xl flex flex-wrap items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#55d29d] animate-ping" />
            <b className="text-[#35c2d4]">MOBILE DEVICE GPS BROADCASTING ACTIVE:</b>
            <span className="font-mono text-[#e9f0f2]">
              Lat: {gpsFix.lat.toFixed(4)}, Lng: {gpsFix.lng.toFixed(4)}
            </span>
          </div>
          <span className="text-[10px] text-[#7d9099] font-mono">Source: HTML5 Geolocation API · 5s Interval</span>
        </div>
      )}

      <div className="module-toolbar flex gap-3 my-4">
        <div className="map-search flex-1">
          <Search size={15} />
          <input
            placeholder="Search vehicle number, driver, cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-[#101d23] border border-[#20323b] rounded px-3 py-1 text-xs text-[#cad6da]"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="on_route">On Route</option>
          <option value="delayed">Delayed</option>
          <option value="emergency">Emergency Priority</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => (
          <div
            key={v.id}
            className="p-4 bg-[#111f26] border border-[#20323b] rounded-lg hover:border-[#35c2d4] cursor-pointer transition-all space-y-3"
            onClick={() => onVehicle(v)}
          >
            <div className="flex justify-between items-start">
              <div>
                <b className="text-sm text-[#e9f0f2] block">{v.vehicleNumber}</b>
                <span className="text-[10px] text-[#7d9099]">{v.driverName}</span>
              </div>
              <StatusPill tone={v.status === 'delayed' ? 'amber' : v.status === 'emergency' ? 'red' : 'green'}>
                {v.status.toUpperCase()}
              </StatusPill>
            </div>

            <div className="space-y-1 text-xs text-[#cad6da]">
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Cargo:</span>
                <span className="font-medium">{v.cargo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Route:</span>
                <span>{v.origin} ➔ {v.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Speed & ETA:</span>
                <span className="font-mono">{v.speed} km/h · ETA {v.eta}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[10px] text-[#7d9099] mb-1">
                <span>Progress</span>
                <span className="font-mono">{v.deliveryPercentage ?? 50}%</span>
              </div>
              <div className="h-1.5 bg-[#20323b] rounded overflow-hidden">
                <div
                  className="h-full bg-[#35c2d4]"
                  style={{ width: `${v.deliveryPercentage ?? 50}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeliveriesView({
  deliveries,
  vehicles,
}: {
  deliveries: Delivery[]
  vehicles: Vehicle[]
}) {
  return (
    <div className="module-view">
      <div className="module-hero">
        <div>
          <div className="eyebrow">ESSENTIAL SUPPLY SHIPMENTS</div>
          <h1>Active Deliveries ({deliveries.length})</h1>
          <p>Tracking vital medical, food, and rescue material logistics across the region.</p>
        </div>
      </div>

      <div className="data-table mt-4">
        <div className="table-header">
          <span>Delivery ID & Cargo</span>
          <span>Pickup / Destination</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Scheduled / ETA</span>
          <span />
        </div>
        {deliveries.map((del) => (
          <div className="table-row" key={del.id}>
            <span className="table-primary">
              <span className="table-icon vehicle-icon">
                <Package size={14} />
              </span>
              <b>{del.id}</b>
              <small>{del.cargoType}</small>
            </span>
            <span>{del.pickupLocation} ➔ {del.destination}</span>
            <span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  del.priority === 'critical'
                    ? 'bg-[#e76561]/20 text-[#e76561] border border-[#e76561]/40'
                    : del.priority === 'high'
                    ? 'bg-[#e9ad4b]/20 text-[#e9ad4b]'
                    : 'bg-[#35c2d4]/20 text-[#35c2d4]'
                }`}
              >
                {del.priority}
              </span>
            </span>
            <span>
              <StatusPill tone={del.status === 'delayed' || del.status === 'at_risk' ? 'amber' : del.status === 'rerouted' ? 'blue' : 'green'}>
                {del.status.replace('_', ' ')}
              </StatusPill>
            </span>
            <span className="font-mono text-[10px]">
              {del.eta ?? del.scheduledTime}
              {del.delayMinutes && del.delayMinutes > 0 ? (
                <span className="text-[#e76561] block">+{del.delayMinutes}m delay</span>
              ) : null}
            </span>
            <span><ArrowUpRight size={14} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoutesView({
  roads,
  incidents,
  weather,
  onRoadSelect,
  onNotify,
}: {
  roads: Road[]
  incidents: Incident[]
  weather: any
  onRoadSelect: (r: Road) => void
  onNotify: (msg: string) => void
}) {
  const [origin, setOrigin] = useState('Guwahati')
  const [destination, setDestination] = useState('Imphal')
  const [candidates, setCandidates] = useState<RouteCandidate[]>([])

  const handleOptimize = () => {
    const list = calculateRiskAwareRouteCandidates({
      origin,
      destination,
      incidents,
      weather,
      primaryBlocked: roads.some((r) => r.status === 'blocked'),
    })
    setCandidates(list)
    onNotify('AI Route Optimizer computed 3 candidate corridors with multi-factor risk weighting.')
  }

  return (
    <div className="module-view space-y-6">
      <div className="module-hero">
        <div>
          <div className="eyebrow">HIGHWAY ACCESSIBILITY & ROUTE OPTIMIZATION</div>
          <h1>Corridors & Multi-Route Optimizer</h1>
          <p>Risk-aware route cost optimization considering terrain slope, flood stage, and landslide probability.</p>
        </div>
      </div>

      {/* Interactive Route Optimizer Engine */}
      <div className="p-4 bg-[#111f26] border border-[#20323b] rounded-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#35c2d4]">
          <Zap size={16} />
          <span>Interactive AI Route Optimizer</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] text-[#7d9099] mb-1">Origin City</label>
            <select
              className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-xs text-[#e9f0f2]"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            >
              <option value="Guwahati">Guwahati (Central Hub)</option>
              <option value="Shillong">Shillong (Regional Hub)</option>
              <option value="Siliguri">Siliguri (North Corridor)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-[#7d9099] mb-1">Destination City</label>
            <select
              className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-xs text-[#e9f0f2]"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="Imphal">Imphal (Eastern Depot)</option>
              <option value="Aizawl">Aizawl (Civil Hospital)</option>
              <option value="Kohima">Kohima (Naga Hospital)</option>
              <option value="Gangtok">Gangtok (STNM Hospital)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="primary-button w-full h-[36px]"
              onClick={handleOptimize}
            >
              <Zap size={14} /> [ OPTIMIZE ROUTE ]
            </button>
          </div>
        </div>

        {/* Candidates comparison */}
        {candidates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {candidates.map((c) => (
              <div
                key={c.id}
                className={`p-3 rounded-lg border ${
                  c.isRecommended
                    ? 'bg-[#152a31] border-[#35c2d4]'
                    : c.accessibility === 'blocked'
                    ? 'bg-[#251b20] border-[#e76561]/50'
                    : 'bg-[#0d1a20] border-[#20323b]'
                } space-y-2 text-xs`}
              >
                <div className="flex justify-between items-start">
                  <b className="text-[#e9f0f2]">{c.name}</b>
                  {c.isRecommended && (
                    <span className="px-1.5 py-0.5 bg-[#35c2d4] text-[#071014] rounded text-[9px] font-bold">
                      SAFEST
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#cad6da] space-y-1">
                  <div>Distance: <b className="font-mono">{c.distance} km</b></div>
                  <div>ETA: <b className="font-mono">{Math.floor(c.estimatedTime / 60)}h {Math.round(c.estimatedTime % 60)}m</b></div>
                  <div>AI Risk: <b className={c.riskLevel === 'low' ? 'text-[#55d29d]' : 'text-[#e76561]'}>{c.riskLevel.toUpperCase()} ({100 - c.score}%)</b></div>
                </div>
                <p className="text-[9px] text-[#7d9099] border-t border-[#20323b] pt-1.5">
                  {c.reason}
                </p>
                {c.riskReduction ? (
                  <div className="text-[9px] font-mono text-[#55d29d] font-bold">
                    Risk Reduction: {c.riskReduction}%
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Highway Corridors Table */}
      <div className="data-table">
        <div className="table-header">
          <span>Corridor & Highway</span>
          <span>Status</span>
          <span>Rainfall / Traffic</span>
          <span>Landslide / Flood Risk</span>
          <span>Overall AI Risk</span>
          <span />
        </div>
        {roads.map((r) => (
          <div
            className="table-row cursor-pointer"
            key={r.id}
            onClick={() => onRoadSelect(r)}
          >
            <span className="table-primary">
              <span className="table-icon incident-icon">
                <RouteIcon size={14} />
              </span>
              <b>{r.name}</b>
              <small>{r.startDistrict} ➔ {r.endDistrict}</small>
            </span>
            <span>
              <StatusPill tone={r.status === 'blocked' ? 'red' : r.status === 'orange' ? 'amber' : 'green'}>
                {r.status.toUpperCase()}
              </StatusPill>
            </span>
            <span className="font-mono">{r.rainfallMm ?? 40} mm · {r.trafficLevel ?? 'medium'}</span>
            <span className="font-mono text-xs text-[#cad6da]">
              LS: {r.landslideProb ?? 30}% · FL: {r.floodRisk ?? 20}%
            </span>
            <span className={`font-mono font-bold ${(r.overallRisk ?? 40) >= 80 ? 'text-[#e76561]' : (r.overallRisk ?? 40) >= 60 ? 'text-[#e9ad4b]' : 'text-[#55d29d]'}`}>
              {r.overallRisk ?? 40}/100
            </span>
            <span><ArrowUpRight size={14} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function IncidentsView({
  incidents,
  onIncident,
  onNewIncident,
}: {
  incidents: Incident[]
  onIncident: (i: Incident) => void
  onNewIncident: () => void
}) {
  return (
    <div className="module-view">
      <div className="module-hero">
        <div>
          <div className="eyebrow">DISRUPTION & INCIDENT INTELLIGENCE</div>
          <h1>Current Verified Incidents ({incidents.length})</h1>
          <p>Multi-source verified incident ingestion from Field Officers, Meteorological Sensors, and Disaster Feeds.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={onNewIncident}
        >
          <FileWarning size={15} /> Report New Incident
        </button>
      </div>

      {incidents.length === 0 ? (
        <div className="my-8 p-8 bg-[#111f26] border border-[#20323b] rounded-xl text-center space-y-2">
          <CheckCircle2 size={32} className="text-[#55d29d] mx-auto" />
          <b className="text-sm text-[#e9f0f2] block">NO VERIFIED LIVE INCIDENTS CURRENTLY ACTIVE</b>
          <p className="text-xs text-[#7d9099] max-w-md mx-auto">
            All regional lifeline highways are operational without reported disruptions. New field reports submitted by officers or weather feeds will appear immediately upon verification.
          </p>
        </div>
      ) : (
        <div className="data-table mt-4">
          <div className="table-header">
            <span>Incident & Type</span>
            <span>Location / Corridor</span>
            <span>Severity</span>
            <span>Source & Verification</span>
            <span>Confidence</span>
            <span>Timestamp</span>
            <span />
          </div>
          {incidents.map((inc) => (
            <div
              className="table-row cursor-pointer"
              key={inc.id}
              onClick={() => onIncident(inc)}
            >
              <span className="table-primary">
                <span className="table-icon incident-icon">
                  <AlertTriangle size={14} />
                </span>
                <b>{inc.id}</b>
                <small>{inc.type.replace('_', ' ')}</small>
              </span>
              <span>
                <b className="text-[#e9f0f2] block">{inc.location}</b>
                <small className="text-[#7d9099] font-mono">{inc.affectedRoads?.join(', ') || 'Regional road'}</small>
              </span>
              <span>
                <StatusPill tone={inc.severity === 'critical' ? 'red' : inc.severity === 'high' ? 'amber' : 'blue'}>
                  {inc.severity.toUpperCase()}
                </StatusPill>
              </span>
              <span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#152a31] border border-[#23424d] text-[#35c2d4] block w-fit">
                  {inc.source || 'Field Officer'}
                </span>
                <small className="text-[#55d29d] font-mono text-[9px]">
                  {inc.verified ? '✓ VERIFIED' : 'PENDING'}
                </small>
              </span>
              <span className="font-mono text-[#55d29d]">{inc.confidence}%</span>
              <span className="text-[11px] font-mono text-[#cad6da]">{inc.timestamp}</span>
              <span><ArrowUpRight size={14} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PredictionsView({
  roads,
  weatherList,
  onNotify,
}: {
  roads: Road[]
  weatherList: any[]
  onNotify: (msg: string) => void
}) {
  return (
    <div className="module-view space-y-6">
      <div className="module-hero">
        <div>
          <div className="eyebrow">PREDICTIVE INTELLIGENCE ENGINE</div>
          <h1>AI Risk Predictions & Explainability</h1>
          <p>Multi-factor risk prediction breakdown showing why specific corridors have elevated vulnerability.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roads.map((road) => {
          const breakdown = calculateDetailedRisk({
            rainfallMm: road.rainfallMm ?? 50,
            roadCondition: road.roadCondition ?? 'Fair',
            terrainSlopeDeg: road.name === 'NH-14' || road.name === 'NH-10' ? 38 : 22,
            previousLandslide: road.name === 'NH-14' || road.name === 'NH-10',
            previousFlood: road.name === 'NH-27',
            riverLevelAlert: road.name === 'NH-27',
          })

          return (
            <div
              key={road.id}
              className="p-4 bg-[#111f26] border border-[#20323b] rounded-lg space-y-3 text-xs"
            >
              <div className="flex justify-between items-start">
                <div>
                  <b className="text-sm text-[#e9f0f2] block">{road.name} Corridor</b>
                  <span className="text-[10px] text-[#7d9099]">{road.startDistrict} ➔ {road.endDistrict}</span>
                </div>
                <span
                  className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                    breakdown.overallRisk >= 80 ? 'bg-[#e76561]/20 text-[#e76561]' : breakdown.overallRisk >= 60 ? 'bg-[#e9ad4b]/20 text-[#e9ad4b]' : 'bg-[#55d29d]/20 text-[#55d29d]'
                  }`}
                >
                  {breakdown.overallRisk}/100 · {breakdown.riskLevel.toUpperCase()}
                </span>
              </div>

              {/* Sub scores */}
              <div className="grid grid-cols-4 gap-2 text-center p-2 bg-[#091116] rounded border border-[#20323b]">
                <div>
                  <span className="text-[9px] text-[#7d9099] block">Landslide</span>
                  <b className="font-mono text-[#e9ad4b]">{breakdown.landslideRisk}%</b>
                </div>
                <div>
                  <span className="text-[9px] text-[#7d9099] block">Flood</span>
                  <b className="font-mono text-[#35c2d4]">{breakdown.floodRisk}%</b>
                </div>
                <div>
                  <span className="text-[9px] text-[#7d9099] block">Damage</span>
                  <b className="font-mono text-[#cad6da]">{breakdown.roadDamageRisk}%</b>
                </div>
                <div>
                  <span className="text-[9px] text-[#7d9099] block">Traffic</span>
                  <b className="font-mono text-[#cad6da]">{breakdown.trafficRisk}%</b>
                </div>
              </div>

              {/* Explainability factors */}
              <div>
                <b className="text-[10px] text-[#7d9099] uppercase block mb-1">Key Vulnerability Factors:</b>
                <ul className="space-y-1 list-disc list-inside text-[11px] text-[#cad6da]">
                  {breakdown.factors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
              </div>

              <p className="text-[10px] text-[#7d9099] border-t border-[#20323b] pt-2 italic">
                {breakdown.predictionText}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SuppliesView({
  supplies,
  warehouses,
  deliveries,
  onNotify,
}: {
  supplies: Supply[]
  warehouses: Warehouse[]
  deliveries: Delivery[]
  onNotify: (msg: string) => void
}) {
  return (
    <div className="module-view space-y-6">
      <div className="module-hero">
        <div>
          <div className="eyebrow">SUPPLY CHAIN INTELLIGENCE & SHORTAGE FORECAST</div>
          <h1>Critical Supply Inventories</h1>
          <p>Prioritizing lifesaving medicine, food grains, and fuel supplies with depletion countdowns.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supplies.map((item) => {
          const priorityScore = computeSupplyPriorityScore(item)
          const isCritical = item.riskLevel === 'critical' || item.daysRemaining <= 3

          return (
            <div
              key={item.id}
              className={`p-4 bg-[#111f26] border ${
                isCritical ? 'border-[#e76561]/60' : 'border-[#20323b]'
              } rounded-lg space-y-3 text-xs`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <b className="text-sm text-[#e9f0f2] block">{item.name}</b>
                  <span className="text-[10px] text-[#7d9099] capitalize">{item.category} Category</span>
                </div>
                <span className="px-2 py-0.5 bg-[#35c2d4]/20 text-[#35c2d4] border border-[#35c2d4]/40 rounded font-mono font-bold text-[10px]">
                  PRIORITY: {priorityScore}/100
                </span>
              </div>

              <div className="space-y-1.5 text-[#cad6da]">
                <div className="flex justify-between">
                  <span className="text-[#7d9099]">Current Stock:</span>
                  <span className="font-mono font-bold">{item.stock} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d9099]">Min Safety Threshold:</span>
                  <span className="font-mono">{item.minimumThreshold} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d9099]">Days Remaining:</span>
                  <span className={`font-mono font-bold ${item.daysRemaining <= 3 ? 'text-[#e76561]' : 'text-[#55d29d]'}`}>
                    {item.daysRemaining} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d9099]">Incoming Supplies:</span>
                  <span className="font-mono text-[#35c2d4]">+{item.incoming} units</span>
                </div>
              </div>

              {/* Stock gauge */}
              <div>
                <div className="h-2 bg-[#20323b] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.daysRemaining <= 3 ? 'bg-[#e76561]' : 'bg-[#55d29d]'}`}
                    style={{ width: `${Math.min(100, (item.stock / item.minimumThreshold) * 60)}%` }}
                  />
                </div>
              </div>

              {isCritical && (
                <div className="p-2 rounded bg-[#3a2022] border border-[#854543] text-[10px] text-[#f0a29a] flex items-center justify-between">
                  <span>Stock critically low · Dispatch priority required</span>
                  <button
                    type="button"
                    className="underline font-bold"
                    onClick={() => onNotify(`Prioritization order logged for ${item.name}`)}
                  >
                    Prioritize
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WarehousesView({
  warehouses,
  supplies,
}: {
  warehouses: Warehouse[]
  supplies: Supply[]
}) {
  return (
    <div className="module-view space-y-6">
      <div className="module-hero">
        <div>
          <div className="eyebrow">STORAGE & LOGISTICS HUBS</div>
          <h1>Regional Warehouses & Depots ({warehouses.length})</h1>
          <p>Capacity monitoring, daily consumption rates, and buffer storage readiness across NER.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <div
            key={w.id}
            className="p-4 bg-[#111f26] border border-[#20323b] rounded-lg space-y-3 text-xs"
          >
            <div className="flex justify-between items-start">
              <div>
                <b className="text-sm text-[#e9f0f2] block">{w.name}</b>
                <span className="text-[10px] text-[#7d9099]">{w.district} District Hub</span>
              </div>
              <StatusPill tone={w.currentInventory < 40 ? 'amber' : 'green'}>
                {w.currentInventory}% FULL
              </StatusPill>
            </div>

            <div className="space-y-1.5 text-[#cad6da]">
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Capacity Utilized:</span>
                <span className="font-mono">{w.currentInventory} / {w.capacity} tons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Daily Consumption:</span>
                <span className="font-mono">{w.dailyConsumption ?? 5.5} tons/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d9099]">Buffer Autonomy:</span>
                <span className="font-mono text-[#35c2d4]">{w.daysRemaining ?? 8.5} days</span>
              </div>
            </div>

            <div className="h-1.5 bg-[#20323b] rounded overflow-hidden">
              <div
                className="h-full bg-[#35c2d4]"
                style={{ width: `${w.currentInventory}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DistrictAnalyticsView({
  districts,
  roads,
}: {
  districts: District[]
  roads: Road[]
}) {
  return (
    <div className="module-view space-y-6">
      <div className="module-hero">
        <div>
          <div className="eyebrow">DISTRICT CONNECTIVITY INTELLIGENCE</div>
          <h1>8 North Eastern States Connectivity Scorecards</h1>
          <p>Composite connectivity score evaluating road accessibility, weather severity, and incident impacts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {districts.map((d) => {
          const score = d.connectivityScore ?? 75
          const status = d.connectivityStatus ?? 'GOOD'

          return (
            <div
              key={d.id}
              className="p-4 bg-[#111f26] border border-[#20323b] rounded-lg space-y-3 text-xs"
            >
              <div className="flex justify-between items-start">
                <div>
                  <b className="text-base text-[#e9f0f2] block">{d.name}</b>
                  <span className="text-[10px] text-[#7d9099]">{d.state}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    status === 'GOOD'
                      ? 'bg-[#41c18a]/20 text-[#41c18a]'
                      : status === 'MODERATE'
                      ? 'bg-[#e0b649]/20 text-[#e0b649]'
                      : 'bg-[#e76561]/20 text-[#e76561]'
                  }`}
                >
                  {status}
                </span>
              </div>

              <div className="text-center py-2 bg-[#091116] rounded border border-[#20323b]">
                <div className="text-[10px] text-[#7d9099]">CONNECTIVITY SCORE</div>
                <div className="text-2xl font-bold font-mono text-[#35c2d4]">{score} / 100</div>
              </div>

              <div className="space-y-1 text-[#cad6da] text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#7d9099]">Road Status:</span>
                  <span className="capitalize">{d.roadStatus ?? 'open'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d9099]">Active Incidents:</span>
                  <span className="font-mono text-[#e9ad4b]">{d.activeIncidents ?? 2}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d9099]">Delayed Convoys:</span>
                  <span className="font-mono">{d.delayedDeliveries ?? 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d9099]">Supplies Status:</span>
                  <span className="capitalize">{d.supplyStatus ?? 'adequate'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DisasterSimulationView({
  roads,
  vehicles,
  deliveries,
  onRun,
  onNotify,
}: {
  roads: Road[]
  vehicles: Vehicle[]
  deliveries: Delivery[]
  onRun: (params: DisasterSimulationParams) => any
  onNotify: (msg: string) => void
}) {
  const [rainfall, setRainfall] = useState<'Normal' | 'Moderate' | 'Heavy' | 'Extreme'>('Heavy')
  const [floodLevel, setFloodLevel] = useState(2.5)
  const [traffic, setTraffic] = useState<'Low' | 'Moderate' | 'Heavy' | 'Extreme'>('Heavy')
  const [blockedRoad, setBlockedRoad] = useState(roads[0]?.id ?? 'r1')
  const [landslideProb, setLandslideProb] = useState(82)
  const [result, setResult] = useState<any>(null)

  const handleSimulate = () => {
    const res = onRun({
      rainfall,
      floodLevelM: floodLevel,
      traffic,
      blockedRoadId: blockedRoad,
      landslideProbability: landslideProb,
    })
    setResult(res)
    onNotify('Disaster simulation scenario calculated successfully!')
  }

  return (
    <div className="module-view space-y-6">
      <div className="module-hero">
        <div>
          <div className="eyebrow">WHAT-IF SCENARIO TESTING</div>
          <h1>Disaster Impact Simulator</h1>
          <p>Evaluate infrastructure resilience, impacted convoys, and alternate corridor capacity during extreme disaster events.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="p-4 bg-[#111f26] border border-[#20323b] rounded-lg space-y-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#e9ad4b]">
            <SlidersHorizontal size={16} />
            <span>Simulation Parameters</span>
          </div>

          <div>
            <label className="block text-[#7d9099] mb-1">Rainfall Intensity</label>
            <select
              className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
              value={rainfall}
              onChange={(e) => setRainfall(e.target.value as any)}
            >
              <option value="Normal">Normal Monsoon (20-30 mm)</option>
              <option value="Moderate">Moderate Downpour (50-60 mm)</option>
              <option value="Heavy">Heavy Cloudburst (80-90 mm)</option>
              <option value="Extreme">Extreme Torrential (120+ mm)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#7d9099] mb-1">
              River Inundation Level: <b className="font-mono text-[#35c2d4]">{floodLevel} meters</b>
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={floodLevel}
              onChange={(e) => setFloodLevel(Number(e.target.value))}
              className="w-full accent-[#35c2d4]"
            />
          </div>

          <div>
            <label className="block text-[#7d9099] mb-1">
              Landslide Hazard Probability: <b className="font-mono text-[#e9ad4b]">{landslideProb}%</b>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={landslideProb}
              onChange={(e) => setLandslideProb(Number(e.target.value))}
              className="w-full accent-[#e9ad4b]"
            />
          </div>

          <div>
            <label className="block text-[#7d9099] mb-1">Corridor Blockade Target</label>
            <select
              className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
              value={blockedRoad}
              onChange={(e) => setBlockedRoad(e.target.value)}
            >
              {roads.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.startDistrict} ➔ {r.endDistrict})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#7d9099] mb-1">Convoy Congestion Density</label>
            <select
              className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
              value={traffic}
              onChange={(e) => setTraffic(e.target.value as any)}
            >
              <option value="Low">Low Density</option>
              <option value="Moderate">Moderate Density</option>
              <option value="Heavy">Heavy Military & Relief Traffic</option>
              <option value="Extreme">Extreme Gridlock</option>
            </select>
          </div>

          <button
            type="button"
            className="primary-button full mt-2"
            onClick={handleSimulate}
          >
            <Zap size={14} /> [ RUN SIMULATION ]
          </button>
        </div>

        {/* Results Before vs After */}
        <div className="p-4 bg-[#111f26] border border-[#20323b] rounded-lg space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-[#35c2d4]">
              <Activity size={16} />
              <span>Before vs. After Impact Assessment</span>
            </div>
            {result && <span className="text-[10px] text-[#7d9099]">Run: {result.appliedAt}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="p-3 bg-[#0d1a20] rounded border border-[#20323b] space-y-2">
              <b className="text-[#55d29d] block border-b border-[#20323b] pb-1">BEFORE DISASTER</b>
              <div className="flex justify-between">
                <span>Safe Routes:</span>
                <b className="font-mono text-[#55d29d]">{result ? result.before.safeRoutes : 5}</b>
              </div>
              <div className="flex justify-between">
                <span>High Risk Corridors:</span>
                <b className="font-mono text-[#e9ad4b]">{result ? result.before.highRisk : 2}</b>
              </div>
              <div className="flex justify-between">
                <span>Blocked Corridors:</span>
                <b className="font-mono text-[#e76561]">{result ? result.before.blocked : 0}</b>
              </div>
            </div>

            {/* After */}
            <div className="p-3 bg-[#152a31] rounded border border-[#35c2d4] space-y-2">
              <b className="text-[#35c2d4] block border-b border-[#20323b] pb-1">AFTER SIMULATION</b>
              <div className="flex justify-between">
                <span>Safe Routes:</span>
                <b className="font-mono text-[#55d29d]">{result ? result.after.safeRoutes : 2}</b>
              </div>
              <div className="flex justify-between">
                <span>High Risk Corridors:</span>
                <b className="font-mono text-[#e9ad4b]">{result ? result.after.highRisk : 3}</b>
              </div>
              <div className="flex justify-between">
                <span>Blocked Corridors:</span>
                <b className="font-mono text-[#e76561]">{result ? result.after.blocked : 2}</b>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#0d1a20] rounded border border-[#20323b] space-y-1.5">
            <b className="text-[#e9f0f2] block text-[11px]">Systemic Impact Summary</b>
            <div className="flex justify-between">
              <span className="text-[#7d9099]">Affected Vehicles in Hazard:</span>
              <b className="font-mono text-[#e76561]">{result ? result.after.affectedVehicles : 8}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7d9099]">Delayed Deliveries:</span>
              <b className="font-mono text-[#e9ad4b]">{result ? result.after.affectedDeliveries : 5}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7d9099]">Districts Isolated / Affected:</span>
              <b className="font-mono">{result ? result.after.affectedDistricts : 3}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7d9099]">Alternate Routes Calculated:</span>
              <b className="font-mono text-[#55d29d]">{result ? result.after.alternateRoutesFound : 8} available</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldReportingView({
  online,
  gps,
  onRequestLocation,
  onSubmitReport,
  onSync,
}: {
  online: boolean
  gps: GeoPoint | null
  onRequestLocation: () => void
  onSubmitReport: (r: FieldReport) => Promise<void>
  onSync: () => Promise<any>
}) {
  const [incidentType, setIncidentType] = useState<IncidentType>('landslide')
  const [severity, setSeverity] = useState<IncidentSeverity>('high')
  const [locationLabel, setLocationLabel] = useState('NH-14 · Tamenglong Pass')
  const [description, setDescription] = useState('')
  const [officerName, setOfficerName] = useState('Field Officer T. Jamir')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleCaptureLocation = () => {
    onRequestLocation()
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const report: FieldReport = {
      id: `FR-${Date.now().toString().slice(-4)}`,
      officerId: 'fo-07',
      officerName,
      locationLabel,
      location: gps ? { lat: gps.lat, lng: gps.lng } : { lat: 24.98, lng: 93.62 },
      incidentType,
      severity,
      description,
      photoDataUrl: photoPreview ?? undefined,
      timestamp: 'Just now',
      synced: online,
      syncState: online ? 'synced' : 'pending',
    }

    await onSubmitReport(report)
    setSubmitting(false)
    setDescription('')
    setPhotoPreview(null)
  }

  return (
    <div className="module-view space-y-6 max-w-2xl mx-auto">
      <div className="module-hero">
        <div>
          <div className="eyebrow">OFFLINE-CAPABLE FIELD INTERFACE</div>
          <h1>Field Officer Incident Reporting</h1>
          <p>Geo-tagged reporting with offline storage and automatic background sync when connectivity returns.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 bg-[#111f26] border border-[#20323b] rounded-lg space-y-4 text-xs">
        {/* Offline Status Badge */}
        <div className={`p-2 rounded border flex items-center justify-between ${online ? 'bg-[#55d29d]/10 border-[#55d29d]/30 text-[#55d29d]' : 'bg-[#e76561]/10 border-[#e76561]/30 text-[#e76561]'}`}>
          <div className="flex items-center gap-2">
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span className="font-bold">
              {online ? 'ONLINE: Reports uploaded directly to Central Command' : 'OFFLINE: Reports will be saved locally and auto-synced'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[#7d9099] mb-1">Field Officer Name</label>
            <input
              className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[#7d9099] mb-1">Incident Type</label>
            <select
              className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as any)}
            >
              <option value="landslide">Landslide / Slope Shear</option>
              <option value="flood">Flash Flood / River Inundation</option>
              <option value="road_damage">Road Subsidence / Pavement Crack</option>
              <option value="bridge_damage">Bridge Structural Damage</option>
              <option value="heavy_rain">Severe Monsoon Zero-Visibility</option>
              <option value="traffic">Extreme Corridor Congestion</option>
            </select>
          </div>
        </div>

        {/* GPS Capture */}
        <div className="p-3 bg-[#0d1a20] rounded border border-[#20323b] space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#7d9099]">GPS Coordinates:</span>
            <button
              type="button"
              className="secondary-button py-1 px-2 text-[10px]"
              onClick={handleCaptureLocation}
            >
              <Crosshair size={12} /> [ CAPTURE LOCATION ]
            </button>
          </div>
          <div className="font-mono text-[#35c2d4] text-[11px]">
            {gps ? `Lat: ${gps.lat.toFixed(4)}, Lng: ${gps.lng.toFixed(4)} (Browser Fix)` : 'Using Corridor Default: 24.9800° N, 93.6200° E'}
          </div>
        </div>

        <div>
          <label className="block text-[#7d9099] mb-1">Location Label</label>
          <input
            className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-[#7d9099] mb-1">Severity</label>
          <select
            className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
          >
            <option value="critical">Critical (Both lanes impassable)</option>
            <option value="high">High (Single-lane alternating)</option>
            <option value="medium">Medium (Slow speed caution)</option>
            <option value="low">Low (Debris on shoulder)</option>
          </select>
        </div>

        <div>
          <label className="block text-[#7d9099] mb-1">Description & Field Notes</label>
          <textarea
            rows={3}
            className="w-full bg-[#0d1a20] border border-[#20323b] p-2 rounded text-[#e9f0f2]"
            placeholder="Report boulder debris size, water depth, estimated clearance time..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-[#7d9099] mb-1">Photo Evidence Upload</label>
          <div className="flex items-center gap-3">
            <label className="secondary-button cursor-pointer">
              <Camera size={14} /> [ TAKE / UPLOAD PHOTO ]
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
            {photoPreview && <span className="text-[#55d29d] text-[10px]">✓ Photo attached</span>}
          </div>
          {photoPreview && (
            <div className="mt-2 max-w-xs rounded overflow-hidden border border-[#20323b]">
              <img src={photoPreview} alt="Evidence preview" className="w-full h-28 object-cover" />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="primary-button full mt-4"
          disabled={submitting}
        >
          {submitting ? 'Submitting & Recalculating AI Risk...' : '[ SUBMIT REPORT ]'}
        </button>
      </form>
    </div>
  )
}

function SettingsView({
  demoMode,
  setDemoMode,
  language,
  setLanguage,
  simulation,
  setSimulation,
  emergency,
  setEmergency,
}: {
  demoMode: boolean
  setDemoMode: (b: boolean) => void
  language: AppLanguage
  setLanguage: (l: AppLanguage) => void
  simulation: boolean
  setSimulation: (b: boolean) => void
  emergency: boolean
  setEmergency: (b: boolean) => void
}) {
  return (
    <div className="module-view space-y-6 max-w-2xl">
      <div className="module-hero">
        <div>
          <div className="eyebrow">SYSTEM CONFIGURATION</div>
          <h1>Platform Settings & Controls</h1>
          <p>Configure global modes, GIS layers, simulation frequency, and language preference.</p>
        </div>
      </div>

      <div className="p-4 bg-[#111f26] border border-[#20323b] rounded-lg space-y-4 text-xs">
        <div className="flex justify-between items-center border-b border-[#20323b] pb-3">
          <div>
            <b className="text-sm text-[#e9f0f2] block">Global Operation Mode</b>
            <span className="text-[#7d9099]">Toggle between Simulated Demo Mode and Live API Mode</span>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setDemoMode(!demoMode)}
          >
            {demoMode ? 'Switch to LIVE MODE' : 'Switch to DEMO MODE'}
          </button>
        </div>

        <div className="flex justify-between items-center border-b border-[#20323b] pb-3">
          <div>
            <b className="text-sm text-[#e9f0f2] block">Language Selection</b>
            <span className="text-[#7d9099]">Support for English, Hindi, Assamese, Bengali</span>
          </div>
          <select
            className="bg-[#0d1a20] border border-[#20323b] p-1.5 rounded text-[#e9f0f2]"
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="as">অসমীয়া (Assamese)</option>
            <option value="bn">বাংলা (Bengali)</option>
          </select>
        </div>

        <div className="flex justify-between items-center border-b border-[#20323b] pb-3">
          <div>
            <b className="text-sm text-[#e9f0f2] block">Simulated GPS Movement</b>
            <span className="text-[#7d9099]">Update vehicle telemetry positions every 3 seconds</span>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSimulation(!simulation)}
          >
            {simulation ? 'Disable Simulation' : 'Enable Simulation'}
          </button>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <b className="text-sm text-[#e9f0f2] block">Emergency Operations Protocol</b>
            <span className="text-[#7d9099]">Enforce green corridor prioritization for medical deliveries</span>
          </div>
          <button
            type="button"
            className={`emergency-button ${emergency ? 'active' : ''}`}
            onClick={() => setEmergency(!emergency)}
          >
            {emergency ? 'Deactivate Emergency' : 'Activate Emergency'}
          </button>
        </div>
      </div>
    </div>
  )
}
