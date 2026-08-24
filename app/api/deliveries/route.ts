import { NextResponse } from 'next/server'
import { deliveryService } from '@/services'

export async function GET() {
  const deliveries = await deliveryService.list()
  return NextResponse.json({ success: true, data: deliveries, count: deliveries.length })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const delivery = await deliveryService.create(body)
    return NextResponse.json({ success: true, data: delivery }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
