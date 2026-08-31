import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, blindHash, hashToken, randomToken } from '@/lib/crypto';
import { sendOwnerNewOrder } from '@/lib/email';
import { sendOwnerNewOrderWhatsApp } from '@/lib/whatsapp';
import { publishOrderEvent } from '@/lib/order-events';
import { calculateCart } from '@/lib/payment-intent';
import { assertOrderingOpen, validateCustomerInput, validateFulfillment } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    assertOrderingOpen();
    const b = await req.json();
    const customer = validateCustomerInput({ name: b.customerName ?? b.name, email: b.customerEmail ?? b.email, phone: b.customerPhone ?? b.phone });
    const fulfillment = validateFulfillment(b.fulfillment);
    const verificationToken = String(b.otpVerificationToken || '');

    const session = await getServerSession(authOptions);
    const sessionPhone = (session?.user as any)?.phone as string | undefined;
    const sessionPhoneVerified = Boolean((session?.user as any)?.phoneVerified);
    if (sessionPhone && sessionPhone !== customer.phone) return NextResponse.json({ error: 'The verified phone number does not match your signed-in account.' }, { status: 403 });
    const accountAlreadyVerified = Boolean(session?.user && sessionPhone === customer.phone && sessionPhoneVerified);
    if (!accountAlreadyVerified && !verificationToken) return NextResponse.json({ error: 'Verify your mobile number with OTP before placing a cash order.' }, { status: 400 });

    const challenge = accountAlreadyVerified ? null : await prisma.otpChallenge.findFirst({
      where: { phoneHash: blindHash(customer.phone), purpose: 'CASH_ORDER', verificationTokenHash: hashToken(verificationToken), verifiedAt: { not: null }, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!accountAlreadyVerified && (!challenge || !challenge.verificationExpiresAt || challenge.verificationExpiresAt <= new Date())) return NextResponse.json({ error: 'Your OTP verification expired. Please verify your phone again.' }, { status: 400 });

    const { subtotal, orderItems } = await calculateCart(b.items);
    const order = await prisma.$transaction(async (tx) => {
      if (!accountAlreadyVerified) {
        const consumed = await tx.otpChallenge.updateMany({ where: { id: challenge!.id, consumedAt: null }, data: { consumedAt: new Date() } });
        if (consumed.count !== 1) throw new Error('This OTP verification has already been used.');
      }
      return tx.order.create({
        data: {
          userId: (session?.user as any)?.id || null,
          customerNameEncrypted: encrypt(customer.name)!,
          customerEmailEncrypted: encrypt(customer.email),
          customerPhoneEncrypted: encrypt(customer.phone)!,
          customerPhoneHash: blindHash(customer.phone),
          fulfillmentType: fulfillment.type,
          fulfillmentData: encrypt(JSON.stringify(fulfillment))!,
          subtotal,
          total: subtotal,
          currency: 'INR',
          status: 'RECEIVED',
          paymentMethod: 'CASH',
          paymentStatus: 'CASH_DUE',
          cashOtpVerifiedAt: accountAlreadyVerified ? new Date() : new Date(),
          trackingToken: randomToken(32),
          items: { create: orderItems },
        },
        include: { items: true },
      });
    });

    publishOrderEvent({ type: 'ORDER_CREATED', orderId: order.id, status: order.status, createdAt: order.createdAt.toISOString(), customerName: customer.name, total: order.total, paymentMethod: order.paymentMethod });
    await Promise.allSettled([
      sendOwnerNewOrder({ orderId: order.id, customerName: customer.name, customerEmail: customer.email || '', customerPhone: customer.phone, total: order.total, paymentMethod: 'CASH', fulfillmentType: order.fulfillmentType, fulfillmentData: JSON.stringify(fulfillment), items: orderItems }),
      sendOwnerNewOrderWhatsApp({ orderId: order.id, customerName: customer.name, total: order.total }),
    ]);
    return NextResponse.json({ success: true, orderId: order.id, trackingToken: order.trackingToken });
  } catch (error) {
    console.error('Cash order failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create cash order.' }, { status: 400 });
  }
}
