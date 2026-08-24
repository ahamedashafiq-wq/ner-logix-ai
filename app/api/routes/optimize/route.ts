import { NextResponse } from 'next/server'
import { routeService } from '@/services'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { origin, destination, blockedRoadId } = body
    if (!origin || !destination) {
      return NextResponse.json({ success: false, error: 'Origin and destination are required' }, { status: 400 })
    }
    const candidates = await routeService.optimize({ origin, destination, blockedRoadId })
    return NextResponse.json({ success: true, data: candidates })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
