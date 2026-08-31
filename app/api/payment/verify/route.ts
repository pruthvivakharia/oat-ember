import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import { finalizePaymentIntent } from '@/lib/payment-intent';
import { publishOrderEvent } from '@/lib/order-events';
import { sendOwnerNewOrderWhatsApp } from '@/lib/whatsapp';
import { sendOwnerNewOrder } from '@/lib/email';

export async function POST(req: Request) {
  try {
    if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ error: 'Online payments are not configured.' }, { status: 503 });
    const b = await req.json();
    const orderId = String(b.razorpay_order_id || '');
    const paymentId = String(b.razorpay_payment_id || '');
    const signature = String(b.razorpay_signature || '');
    if (!orderId || !paymentId || !signature) return NextResponse.json({ error: 'Missing payment verification data.' }, { status: 400 });

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return NextResponse.json({ error: 'Invalid payment signature.' }, { status: 400 });

    const rOrder = await razorpay.orders.fetch(orderId);
    const payment = await razorpay.payments.fetch(paymentId);
    if (rOrder.currency !== 'INR' || payment.order_id !== orderId || payment.status !== 'captured' || Number(payment.amount) !== Number(rOrder.amount)) {
      return NextResponse.json({ error: 'Payment is not captured for the expected order.' }, { status: 400 });
    }

    const intent = await prisma.paymentIntent.findUnique({ where: { razorpayOrderId: orderId } });
    if (!intent || Number(rOrder.amount) !== intent.subtotal * 100) return NextResponse.json({ error: 'Payment amount does not match the checkout.' }, { status: 400 });

    const result = await finalizePaymentIntent({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature });
    if (!result.created) return NextResponse.json({ success: true, orderId: result.order.id, trackingToken: result.order.trackingToken, alreadyProcessed: true });

    const customerName = result.customerName;
    const customerPhone = result.customerPhone;
    const customerEmail = result.customerEmail || '';
    publishOrderEvent({ type: 'ORDER_CREATED', orderId: result.order.id, status: result.order.status, createdAt: result.order.createdAt.toISOString(), customerName, total: result.order.total, paymentMethod: result.order.paymentMethod });
    await Promise.allSettled([
      sendOwnerNewOrder({ orderId: result.order.id, customerName, customerEmail, customerPhone, total: result.order.total, paymentMethod: 'RAZORPAY', fulfillmentType: result.order.fulfillmentType, fulfillmentData: result.fulfillmentData, items: result.orderItems }),
      sendOwnerNewOrderWhatsApp({ orderId: result.order.id, customerName, total: result.order.total }),
    ]);
    return NextResponse.json({ success: true, orderId: result.order.id, trackingToken: result.order.trackingToken });
  } catch (error) {
    console.error('Payment verification failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not verify and save the order.' }, { status: 400 });
  }
}
