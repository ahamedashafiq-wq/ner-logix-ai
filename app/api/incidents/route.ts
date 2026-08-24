import { NextResponse } from 'next/server'
import { incidentService } from '@/services'

export async function GET() {
  const incidents = await incidentService.list()
  return NextResponse.json({ success: true, data: incidents, count: incidents.length })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const incident = await incidentService.create(body)
    return NextResponse.json({ success: true, data: incident }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
