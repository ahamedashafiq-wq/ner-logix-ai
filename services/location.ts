import type { GpsFix } from '@/types'

export type LocationErrorCode = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

export function watchDeviceLocation(
  onFix: (fix: GpsFix) => void,
  onError: (code: LocationErrorCode, message: string) => void,
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('unsupported', 'This browser does not support GPS location.')
    return () => undefined
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onFix({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      })
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) onError('denied', 'Location permission is required for live GPS tracking.')
      else if (error.code === error.TIMEOUT) onError('timeout', 'GPS timed out. Showing the North Eastern Region overview.')
      else onError('unavailable', 'GPS unavailable. Showing the North Eastern Region overview.')
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 4000 },
  )

  return () => navigator.geolocation.clearWatch(watchId)
}

export function requestDeviceLocation(
  onFix: (fix: GpsFix) => void,
  onError: (code: LocationErrorCode, message: string) => void,
): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('unsupported', 'This browser does not support GPS location.')
    return
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      onFix({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      })
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) onError('denied', 'Location permission is required for live GPS tracking.')
      else onError('unavailable', 'GPS unavailable. Showing the North Eastern Region overview.')
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  )
}
