export const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry' | 'routes')[] = ['places', 'geometry']

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? ''
}

export function hasGoogleMapsKey(): boolean {
  const key = getGoogleMapsApiKey()
  return key.length > 10 && key !== 'YOUR_GOOGLE_MAPS_API_KEY'
}
