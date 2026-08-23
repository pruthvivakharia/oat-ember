import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const order = await prisma.order.findUnique({ where: { trackingToken: params.token }, include: { items: true } });
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  return NextResponse.json({
    id: order.id,
    trackingToken: order.trackingToken,
    customerName: order.customerName,
    fulfillmentType: order.fulfillmentType,
    fulfillmentData: order.fulfillmentData,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice }))
  });
}
