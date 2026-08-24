import { NextResponse } from 'next/server'
import { vehicleService } from '@/services'

export async function GET() {
  const vehicles = await vehicleService.list()
  return NextResponse.json({ success: true, data: vehicles, count: vehicles.length })
}
