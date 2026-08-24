import { NextResponse } from 'next/server'
import { supplyService } from '@/services'

export async function GET() {
  const supplies = await supplyService.list()
  return NextResponse.json({ success: true, data: supplies, count: supplies.length })
}
