import { routeCandidates } from '@/mock/data'
import type { Delivery, ImageDetectionResult, Incident, RouteCandidate, Vehicle } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL

export const authService = { async login(email: string, _password: string) { return { id: 'u1', email, name: 'Aarav Sharma', role: 'admin' as const } } }
export const vehicleService = { async list(): Promise<Vehicle[]> { return (await import('@/mock/data')).vehicles }, async get(id: string) { return (await import('@/mock/data')).vehicles.find((vehicle) => vehicle.id === id) } }
export const deliveryService = { async list(): Promise<Delivery[]> { return (await import('@/mock/data')).deliveries }, async create(input: Partial<Delivery>) { return { ...input, id: `del-${Date.now()}`, status: 'created' as const } as Delivery } }
export const routeOptimizationService = { async optimize(_input: { origin: string; destination: string }): Promise<RouteCandidate[]> { return routeCandidates } }
export const incidentService = { async list(): Promise<Incident[]> { return (await import('@/mock/data')).incidents }, async create(input: Partial<Incident>) { return { ...input, id: `INC-${Date.now()}`, status: 'new' as const, timestamp: 'Just now' } as Incident } }
export const predictionService = { async list() { return (await import('@/mock/data')).predictions } }
export const alertService = { async list() { return (await import('@/mock/data')).alerts } }
export const supplyService = { async list() { return (await import('@/mock/data')).supplies } }
export const mapService = { apiUrl: API_URL, async getRegionData() { return (await import('@/mock/data')).districts } }
export const simulationService = { async run(type: string) { return { type, roadStatus: 'blocked', affectedVehicles: 8, affectedDeliveries: 12, alternateRoute: 'Route B', newEta: '7h 58m', risk: 'low' as const } } }
export const imageDetectionService = { async analyze(_file: File): Promise<ImageDetectionResult> { return { detected: true, label: 'Landslide detected', confidence: 94.6, severity: 'high', roadStatus: 'blocked', location: { lat: 24.98, lng: 93.62 }, isSimulated: true } } }
