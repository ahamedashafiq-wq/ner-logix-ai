import { NextResponse } from 'next/server'
import { alertService } from '@/services'

export async function GET() {
  const alerts = await alertService.list()
  return NextResponse.json({ success: true, data: alerts, count: alerts.length })
}
