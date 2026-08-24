import type { WeatherData } from '@/types'

const demoWeather: WeatherData[] = [
  { district: 'Guwahati', temperatureC: 29, rainfallMm: 42, windKph: 18, visibilityKm: 6, condition: 'Humid with scattered rain', warning: 'River watch on Brahmaputra approaches', isDemo: true },
  { district: 'Shillong', temperatureC: 18, rainfallMm: 88, windKph: 22, visibilityKm: 3, condition: 'Heavy rainfall', warning: 'Hill-road caution', isDemo: true },
  { district: 'Imphal', temperatureC: 24, rainfallMm: 61, windKph: 14, visibilityKm: 5, condition: 'Monsoon showers', warning: 'Landslide watch in Tamenglong belt', isDemo: true },
  { district: 'Tawang', temperatureC: 8, rainfallMm: 24, windKph: 28, visibilityKm: 4, condition: 'Low cloud and wind', isDemo: true },
]

export async function getWeather(district?: string): Promise<WeatherData> {
  const match = demoWeather.find((item) => item.district === district) ?? demoWeather[0]
  return { ...match, isDemo: true }
}

export async function listWeather(): Promise<WeatherData[]> {
  return demoWeather
}
