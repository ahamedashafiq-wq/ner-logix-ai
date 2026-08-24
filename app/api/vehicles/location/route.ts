import { NextResponse } from 'next/server'
import { vehicleService } from '@/services'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, lat, lng } = body
    if (!id || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid vehicle ID or coordinates' }, { status: 400 })
    }
    const updated = await vehicleService.updateLocation(id, lat, lng)
    return NextResponse.json({ success: true, data: updated })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
