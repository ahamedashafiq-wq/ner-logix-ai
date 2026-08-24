import type { GeoPoint } from '@/types'

export const NER_CENTER: GeoPoint = { lat: 26.2, lng: 92.9376 }

/** Approximate bounds covering the eight North Eastern states. */
export const NER_BOUNDS = {
  north: 29.45,
  south: 21.95,
  west: 88.0,
  east: 97.42,
} as const

export const NER_OVERVIEW_ZOOM = 6

export function isValidPoint(point?: GeoPoint | null): point is GeoPoint {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function interpolatePoint(origin: GeoPoint, destination: GeoPoint, t: number): GeoPoint {
  const clamped = Math.min(1, Math.max(0, t))
  return {
    lat: origin.lat + (destination.lat - origin.lat) * clamped,
    lng: origin.lng + (destination.lng - origin.lng) * clamped,
  }
}

export function sanitizeText(input: string, max = 2000): string {
  return input.replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max)
}

export function isAllowedImage(file: File): boolean {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  return allowed.includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024
}
