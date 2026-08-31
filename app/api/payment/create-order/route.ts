import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { razorpay } from '@/lib/razorpay';
import { createPaymentIntent } from '@/lib/payment-intent';
import { assertOrderingOpen, validateCustomerInput, validateFulfillment } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    if (!razorpay || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Online payments are not enabled yet. Choose cash at handover for now.' }, { status: 503 });
    }
    assertOrderingOpen();
    const body = await req.json();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const sessionPhone = (session?.user as any)?.phone as string | undefined;
    if (sessionPhone && sessionPhone !== String(body.customerPhone || '').replace(/\D/g, '')) {
      return NextResponse.json({ error: 'The checkout phone does not match your signed-in account.' }, { status: 403 });
    }

    // Create a Razorpay order for the server-calculated cart total, then persist the exact checkout payload.
    // The persisted PaymentIntent is what we trust later; the browser cannot change price/details after payment.
    const preliminaryItems = Array.isArray(body.items) ? body.items : [];
    validateCustomerInput({ name: body.customerName ?? body.name, email: body.customerEmail ?? body.email, phone: body.customerPhone ?? body.phone });
    validateFulfillment(body.fulfillment);
    const { calculateCart } = await import('@/lib/payment-intent');
    const { subtotal } = await calculateCart(preliminaryItems);
    const rOrder = await razorpay.orders.create({
      amount: subtotal * 100,
      currency: 'INR',
      receipt: `cafe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      notes: { source: 'oat_ember_web' },
    });
    const created = await createPaymentIntent({
      razorpayOrderId: rOrder.id,
      userId,
      customerName: body.customerName ?? body.name,
      customerEmail: body.customerEmail ?? body.email,
      customerPhone: body.customerPhone ?? body.phone,
      fulfillment: body.fulfillment,
      items: preliminaryItems,
    });
    return NextResponse.json({ orderId: rOrder.id, amount: created.subtotal * 100, currency: 'INR', customerName: created.customer.name, customerEmail: created.customer.email, customerPhone: created.customer.phone, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Payment order creation failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start payment.' }, { status: 400 });
  }
}
