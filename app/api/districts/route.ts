import { NextResponse } from 'next/server'
import { districtService } from '@/services'

export async function GET() {
  const districts = await districtService.list()
  return NextResponse.json({ success: true, data: districts, count: districts.length })
}
