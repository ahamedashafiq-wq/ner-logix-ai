import { NextResponse } from 'next/server'
import { weatherService } from '@/services'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const district = searchParams.get('district')
  if (district) {
    const weather = await weatherService.get(district)
    return NextResponse.json({ success: true, data: weather })
  }
  const all = await weatherService.list()
  return NextResponse.json({ success: true, data: all, count: all.length })
}
