import { interpolatePoint } from '@/lib/geo'
import { districts } from '@/mock/data'
import type { Vehicle } from '@/types'

export function stepSimulatedVehicles(current: Vehicle[]): Vehicle[] {
  return current.map((vehicle, index) => {
    if (!vehicle.isDemoGps) return vehicle
    if (vehicle.status !== 'on_route' && vehicle.status !== 'delayed' && vehicle.status !== 'emergency') return vehicle

    const dest = districts.find((d) => d.name.toLowerCase() === vehicle.destination?.toLowerCase()) ?? districts[(index + 1) % districts.length]
    
    // Smooth GPS step towards destination
    const stepRatio = 0.008 + (index % 3) * 0.003
    const next = interpolatePoint(vehicle.currentLocation, { lat: dest.lat, lng: dest.lng }, stepRatio)

    // Progress updates
    const currentProgress = vehicle.deliveryPercentage ?? 50
    const newProgress = currentProgress >= 98 ? 20 : Math.min(99, currentProgress + 1)

    // Fuel and battery subtle drain
    const newFuel = Math.max(15, vehicle.fuel - 0.05)
    const newBattery = vehicle.battery ? Math.max(20, vehicle.battery - 0.08) : undefined

    const speed = vehicle.status === 'delayed' ? 18 : vehicle.status === 'emergency' ? 55 : 38 + (index % 12)
    const hoursRemaining = Math.max(0.5, ((100 - newProgress) / 100) * 6)
    const hours = Math.floor(hoursRemaining)
    const minutes = Math.round((hoursRemaining - hours) * 60)

    return {
      ...vehicle,
      currentLocation: next,
      deliveryPercentage: newProgress,
      fuel: Math.round(newFuel * 10) / 10,
      battery: newBattery ? Math.round(newBattery * 10) / 10 : undefined,
      speed,
      eta: `${hours}h ${String(minutes).padStart(2, '0')}m`,
    }
  })
}
