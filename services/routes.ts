import { NER_BOUNDS } from '@/lib/geo'
import { scoreGoogleRoutes } from '@/services/risk-prediction'
import type { GeoPoint, Incident, RouteCandidate, WeatherData } from '@/types'

export async function requestDrivingRoutes(
  origin: GeoPoint,
  destination: GeoPoint,
  incidents: Incident[],
  weather: WeatherData | null,
  primaryBlocked = false,
): Promise<{ candidates: RouteCandidate[]; status: string; result?: google.maps.DirectionsResult }> {
  if (!window.google?.maps) return { candidates: [], status: 'Google Maps is not loaded.' }

  const service = new window.google.maps.DirectionsService()
  return new Promise((resolve) => {
    service.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: { departureTime: new Date(), trafficModel: window.google.maps.TrafficModel.BEST_GUESS },
      },
      (result, status) => {
        if (status !== window.google.maps.DirectionsStatus.OK || !result) {
          resolve({
            candidates: [],
            status: status === 'REQUEST_DENIED' ? 'Directions API is not enabled for this key.' : 'Route unavailable for this origin and destination.',
          })
          return
        }
        resolve({ candidates: scoreGoogleRoutes(result, incidents, weather, primaryBlocked), status: 'OK', result })
      },
    )
  })
}

export async function geocodeInNer(query: string): Promise<GeoPoint | null> {
  return geocodeNerQuery(query)
}

export async function geocodeNerQuery(query: string): Promise<GeoPoint | null> {
  if (!window.google?.maps || !query.trim()) return null
  const geocoder = new window.google.maps.Geocoder()
  const response = await geocoder.geocode({
    address: query,
    bounds: new window.google.maps.LatLngBounds(
      { lat: NER_BOUNDS.south, lng: NER_BOUNDS.west },
      { lat: NER_BOUNDS.north, lng: NER_BOUNDS.east },
    ),
    componentRestrictions: { country: 'IN' },
  })
  const loc = response.results[0]?.geometry.location
  return loc ? { lat: loc.lat(), lng: loc.lng() } : null
}
