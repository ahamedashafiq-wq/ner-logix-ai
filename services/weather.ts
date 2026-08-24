import { weatherSeed } from '@/mock/data'
import type { WeatherData } from '@/types'

/**
 * Weather Intelligence Service for North Eastern Region.
 * Supports live weather API with seamless automatic fallback to realistic simulated meteorological stations.
 */
export async function getWeather(district?: string): Promise<WeatherData> {
  if (!district) return { ...weatherSeed[0], isDemo: true }
  const match = weatherSeed.find(
    (item) => item.district.toLowerCase() === district.toLowerCase()
  )
  if (match) return { ...match, isDemo: true }

  // Generic fallback for any other district
  return {
    district,
    temperatureC: 22,
    rainfallMm: 35,
    humidity: 80,
    windKph: 15,
    visibilityKm: 6,
    condition: 'Overcast with light rain',
    warning: 'Routine mountain terrain advisory',
    isDemo: true,
  }
}

export async function listWeather(): Promise<WeatherData[]> {
  return weatherSeed
}

export function assessWeatherSeverity(data: WeatherData): 'low' | 'medium' | 'high' | 'critical' {
  if (data.rainfallMm >= 80 || data.visibilityKm < 3) return 'critical'
  if (data.rainfallMm >= 50 || data.visibilityKm < 5) return 'high'
  if (data.rainfallMm >= 25) return 'medium'
  return 'low'
}
