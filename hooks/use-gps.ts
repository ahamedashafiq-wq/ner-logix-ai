'use client'

import { useCallback, useEffect, useState } from 'react'
import { requestDeviceLocation, watchDeviceLocation, type LocationErrorCode } from '@/services/location'
import type { GpsFix } from '@/types'

export function useGps() {
  const [fix, setFix] = useState<GpsFix | null>(null)
  const [error, setError] = useState<string>('')
  const [errorCode, setErrorCode] = useState<LocationErrorCode | null>(null)

  useEffect(() => {
    const stop = watchDeviceLocation(
      (next) => {
        setFix(next)
        setError('')
        setErrorCode(null)
      },
      (code, message) => {
        setErrorCode(code)
        setError(message)
      },
    )
    return stop
  }, [])

  const enableLocation = useCallback(() => {
    requestDeviceLocation(
      (next) => {
        setFix(next)
        setError('')
        setErrorCode(null)
      },
      (code, message) => {
        setErrorCode(code)
        setError(message)
      },
    )
  }, [])

  return { fix, error, errorCode, enableLocation }
}
