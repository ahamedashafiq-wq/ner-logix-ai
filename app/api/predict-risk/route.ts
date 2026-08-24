import { NextResponse } from 'next/server'
import { calculateDetailedRisk } from '@/services/risk-prediction'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = calculateDetailedRisk(body)
    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
