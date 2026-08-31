import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { finalizePaymentIntent } from '@/lib/payment-intent';
import { publishOrderEvent } from '@/lib/order-events';
import { sendOwnerNewOrderWhatsApp } from '@/lib/whatsapp';
import { sendOwnerNewOrder } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
    const raw = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });

    const event = JSON.parse(raw);
    const payment = event?.payload?.payment?.entity;
    if (!payment?.order_id || !payment?.id) return NextResponse.json({ received: true });

    const intent = await prisma.paymentIntent.findUnique({ where: { razorpayOrderId: String(payment.order_id) } });
    if (!intent) return NextResponse.json({ received: true });

    if (event.event === 'payment.failed') {
      await prisma.paymentIntent.updateMany({ where: { id: intent.id, status: 'CREATED' }, data: { status: 'FAILED', razorpayPaymentId: String(payment.id) } });
      return NextResponse.json({ received: true });
    }

    if (event.event !== 'payment.captured') return NextResponse.json({ received: true });
    if (payment.status !== 'captured' || Number(payment.amount) !== intent.subtotal * 100 || payment.currency !== 'INR') return NextResponse.json({ error: 'Webhook payment does not match checkout.' }, { status: 400 });

    const result = await finalizePaymentIntent({ razorpayOrderId: String(payment.order_id), razorpayPaymentId: String(payment.id) });
    if (!result.created) return NextResponse.json({ received: true, alreadyProcessed: true });

    publishOrderEvent({ type: 'ORDER_CREATED', orderId: result.order.id, status: result.order.status, createdAt: result.order.createdAt.toISOString(), customerName: result.customerName, total: result.order.total, paymentMethod: result.order.paymentMethod });
    await Promise.allSettled([
      sendOwnerNewOrder({ orderId: result.order.id, customerName: result.customerName, customerEmail: result.customerEmail || '', customerPhone: result.customerPhone, total: result.order.total, paymentMethod: 'RAZORPAY', fulfillmentType: result.order.fulfillmentType, fulfillmentData: result.fulfillmentData, items: result.orderItems }),
      sendOwnerNewOrderWhatsApp({ orderId: result.order.id, customerName: result.customerName, total: result.order.total }),
    ]);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook failed', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
