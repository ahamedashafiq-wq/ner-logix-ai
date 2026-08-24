import { NextResponse } from 'next/server'
import { routeService } from '@/services'

export async function GET() {
  const roads = await routeService.listRoads()
  return NextResponse.json({ success: true, data: roads, count: roads.length })
}
