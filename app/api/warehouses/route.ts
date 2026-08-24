import { NextResponse } from 'next/server'
import { warehouseService } from '@/services'

export async function GET() {
  const warehouses = await warehouseService.list()
  return NextResponse.json({ success: true, data: warehouses, count: warehouses.length })
}
