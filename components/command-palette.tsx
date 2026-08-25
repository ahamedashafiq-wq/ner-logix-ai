'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Boxes,
  BrainCircuit,
  Building2,
  CloudRain,
  Crosshair,
  Hospital as HospitalIcon,
  MapPin,
  Package,
  Route as RouteIcon,
  Search,
  Siren,
  Sparkles,
  Truck,
  Warehouse as WarehouseIcon,
  X,
  Zap,
} from 'lucide-react'
import type { District, Hospital, Incident, Road, Vehicle, Warehouse } from '@/types'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  vehicles: Vehicle[]
  districts: District[]
  hospitals: Hospital[]
  warehouses: Warehouse[]
  roads: Road[]
  incidents: Incident[]
  onSelectVehicle: (v: Vehicle) => void
  onSelectIncident: (i: Incident) => void
  onSelectDistrict: (d: District) => void
  onSelectRoad: (r: Road) => void
  onOpenCopilot: () => void
  onOpenSimulation: () => void
  onToggleEmergency: () => void
  onNavigate: (tab: string) => void
}

export function CommandPalette({
  open,
  onClose,
  vehicles,
  districts,
  hospitals,
  warehouses,
  roads,
  incidents,
  onSelectVehicle,
  onSelectIncident,
  onSelectDistrict,
  onSelectRoad,
  onOpenCopilot,
  onOpenSimulation,
  onToggleEmergency,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Keyboard shortcut listener (Ctrl + K / Cmd + K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) onClose()
        else setQuery('')
      }
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const results: Array<{
      id: string
      title: string
      subtitle: string
      category: 'Vehicles' | 'Districts' | 'Hospitals' | 'Incidents' | 'Roads' | 'Actions'
      icon: any
      badge?: string
      badgeColor?: string
      action: () => void
    }> = []

    // Quick Command Actions
    results.push(
      {
        id: 'action-copilot',
        title: 'Open AI Copilot Intelligence',
        subtitle: 'Ask real-time queries about routes, shortages, and isolation risk',
        category: 'Actions',
        icon: BrainCircuit,
        badge: 'AI',
        badgeColor: 'text-[#35c2d4] bg-[#35c2d4]/10 border-[#35c2d4]/30',
        action: () => {
          onClose()
          onOpenCopilot()
        },
      },
      {
        id: 'action-emergency',
        title: 'Toggle Disaster Emergency Mode',
        subtitle: 'Enforce green-corridors and prioritize lifeline medical shipments',
        category: 'Actions',
        icon: Siren,
        badge: 'OPS',
        badgeColor: 'text-[#e76561] bg-[#e76561]/10 border-[#e76561]/30',
        action: () => {
          onClose()
          onToggleEmergency()
        },
      },
      {
        id: 'action-simulation',
        title: 'Launch Disaster Simulator',
        subtitle: 'Model rainfall, flood surge, and road blockage scenarios',
        category: 'Actions',
        icon: CloudRain,
        badge: 'SIM',
        badgeColor: 'text-[#e9ad4b] bg-[#e9ad4b]/10 border-[#e9ad4b]/30',
        action: () => {
          onClose()
          onOpenSimulation()
        },
      },
      {
        id: 'action-routes',
        title: 'Multi-Corridor Route Optimizer',
        subtitle: 'Compute risk-weighted paths with terrain slope and flood analysis',
        category: 'Actions',
        icon: RouteIcon,
        badge: 'GIS',
        badgeColor: 'text-[#55d29d] bg-[#55d29d]/10 border-[#55d29d]/30',
        action: () => {
          onClose()
          onNavigate('Routes')
        },
      }
    )

    // Vehicles
    vehicles.forEach((v) => {
      results.push({
        id: `vehicle-${v.id}`,
        title: `${v.vehicleNumber} · ${v.cargo || 'General Cargo'}`,
        subtitle: `${v.driverName} · ${v.origin} ➔ ${v.destination} · ${v.speed} km/h`,
        category: 'Vehicles',
        icon: Truck,
        badge: v.status.toUpperCase(),
        badgeColor: v.status === 'delayed' ? 'text-[#e9ad4b]' : 'text-[#55d29d]',
        action: () => {
          onClose()
          onSelectVehicle(v)
          onNavigate('Dashboard')
        },
      })
    })

    // Incidents
    incidents.forEach((i) => {
      results.push({
        id: `incident-${i.id}`,
        title: `${i.id}: ${i.location}`,
        subtitle: `${i.description} (${i.affectedRoads?.join(', ') || 'Corridor'})`,
        category: 'Incidents',
        icon: AlertTriangle,
        badge: i.severity.toUpperCase(),
        badgeColor: i.severity === 'critical' ? 'text-[#e76561]' : 'text-[#e9ad4b]',
        action: () => {
          onClose()
          onSelectIncident(i)
          onNavigate('Dashboard')
        },
      })
    })

    // Hospitals
    hospitals.forEach((h) => {
      results.push({
        id: `hospital-${h.id}`,
        title: `${h.name} (${h.district})`,
        subtitle: `Oxygen: ${h.oxygenRemainingDays ?? 3.5}d buffer · Blood Plasma: ${h.bloodBedsRemaining ?? 24} units`,
        category: 'Hospitals',
        icon: HospitalIcon,
        badge: `${h.bedsAvailable ?? 45} Beds`,
        badgeColor: 'text-[#35c2d4]',
        action: () => {
          onClose()
          onNavigate('Dashboard')
        },
      })
    })

    // Roads
    roads.forEach((r) => {
      results.push({
        id: `road-${r.id}`,
        title: `${r.name} (${r.startDistrict} ➔ ${r.endDistrict})`,
        subtitle: `AI Risk: ${r.overallRisk ?? 40}/100 · Rainfall: ${r.rainfallMm ?? 40}mm · ${r.roadCondition ?? 'Fair'}`,
        category: 'Roads',
        icon: RouteIcon,
        badge: r.status.toUpperCase(),
        badgeColor: r.status === 'blocked' ? 'text-[#e76561]' : r.status === 'orange' ? 'text-[#e9ad4b]' : 'text-[#55d29d]',
        action: () => {
          onClose()
          onSelectRoad(r)
          onNavigate('Dashboard')
        },
      })
    })

    // Districts
    districts.forEach((d) => {
      results.push({
        id: `district-${d.id}`,
        title: `${d.name} District (${d.state})`,
        subtitle: `Accessibility: ${d.accessibilityScore ?? 75}/100 · Isolation Risk: ${d.isolationRisk ?? 25}%`,
        category: 'Districts',
        icon: MapPin,
        badge: d.connectivityStatus ?? 'GOOD',
        badgeColor: d.connectivityStatus === 'CRITICAL' ? 'text-[#e76561]' : 'text-[#55d29d]',
        action: () => {
          onClose()
          onSelectDistrict(d)
          onNavigate('Dashboard')
        },
      })
    })

    if (!q) return results.slice(0, 12)

    return results.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    ).slice(0, 16)
  }, [query, vehicles, incidents, hospitals, roads, districts, onClose, onOpenCopilot, onToggleEmergency, onOpenSimulation, onNavigate, onSelectVehicle, onSelectIncident, onSelectDistrict, onSelectRoad])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-[#03090c]/85 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0e1820] border border-[#263c47] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1c2c35] bg-[#111f28]">
          <Search size={18} className="text-[#35c2d4]" />
          <input
            type="text"
            autoFocus
            className="flex-1 bg-transparent border-0 text-sm text-[#e9f0f2] placeholder-[#6b828a] outline-none font-medium"
            placeholder="Search fleet assets, districts, hospitals, roads, verified incidents... (Type to filter)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <span className="px-2 py-0.5 rounded bg-[#172730] border border-[#273d48] text-[10px] font-mono text-[#8e9fa6]">
            ESC
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6b828a] hover:text-[#e9f0f2] p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-[#7d9099] space-y-2">
              <Search size={24} className="mx-auto text-[#4d6670]" />
              <p className="text-xs">No matching entities or operational commands found.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#182d38] border border-[#35c2d4]/50 text-[#e9f0f2]'
                      : 'hover:bg-[#13232c] text-[#cad6da] border border-transparent'
                  }`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#101d24] border border-[#20323c] flex items-center justify-center text-[#35c2d4] shrink-0">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <b className="text-xs text-[#e9f0f2] truncate block">{item.title}</b>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#091216] border border-[#1b2b33] text-[#7d9099] uppercase font-mono">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#7d9099] truncate block mt-0.5 font-mono">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                        item.badgeColor || 'text-[#35c2d4] bg-[#35c2d4]/10 border-[#35c2d4]/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-[#1c2c35] bg-[#0c161d] flex items-center justify-between text-[10px] text-[#6b828a] font-mono">
          <span>
            Navigate with <kbd className="px-1 py-0.5 rounded bg-[#172730] text-[#cad6da]">↑</kbd>{' '}
            <kbd className="px-1 py-0.5 rounded bg-[#172730] text-[#cad6da]">↓</kbd> · Select with{' '}
            <kbd className="px-1 py-0.5 rounded bg-[#172730] text-[#cad6da]">↵</kbd>
          </span>
          <span className="text-[#35c2d4]">NER-LOGIX AI COMMAND</span>
        </div>
      </div>
    </div>
  )
}
