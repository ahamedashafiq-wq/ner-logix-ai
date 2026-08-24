import { interpolatePoint } from '@/lib/geo'
import { districts } from '@/mock/data'
import type { Vehicle } from '@/types'

export function stepSimulatedVehicles(current: Vehicle[]): Vehicle[] {
  return current.map((vehicle, index) => {
    if (!vehicle.isDemoGps) return vehicle
    if (vehicle.status !== 'on_route' && vehicle.status !== 'delayed' && vehicle.status !== 'emergency') return vehicle
    const dest = districts.find((district) => district.name === vehicle.destination) ?? districts[(index + 1) % districts.length]
    const next = interpolatePoint(vehicle.currentLocation, { lat: dest.lat, lng: dest.lng }, 0.012 + (index % 3) * 0.004)
    const remaining = Math.max(12, (vehicle.speed || 32) / 4)
    return {
      ...vehicle,
      currentLocation: next,
      speed: vehicle.status === 'delayed' ? 18 : 34 + (index % 10),
      eta: `${Math.floor(remaining / 60)}h ${Math.round(remaining % 60)}m`,
    }
  })
}
