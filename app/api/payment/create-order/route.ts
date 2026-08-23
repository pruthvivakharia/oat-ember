import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

const validPhone = (value: string) => /^[6-9]\d{9}$/.test(value.replace(/\D/g, ''));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const customerNameInput = String(body.customerName ?? body.name ?? '').trim();
    const customerEmailInput = String(body.customerEmail ?? body.email ?? '').trim();
    const phone = String(body.customerPhone ?? body.phone ?? '').replace(/\D/g, '');
    if (!items.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    if (!customerNameInput || !customerEmailInput || !validPhone(phone)) return NextResponse.json({ error: 'Name, email and a valid 10-digit Indian mobile number are required.' }, { status: 400 });

    const ids = items.map((i: any) => i.id);
    const products = await prisma.product.findMany({ where: { id: { in: ids }, available: true } });
    const map = new Map(products.map(p => [p.id, p]));
    let subtotal = 0;
    for (const item of items) {
      const p = map.get(item.id);
      const shots = Number(item.customizations?.shots) || 0;
      if (!p || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10 || shots < 0 || shots > 4) return NextResponse.json({ error: 'Invalid cart item.' }, { status: 400 });
      subtotal += (p.price + shots * 50) * item.quantity;
    }

    const session = await getServerSession(authOptions);
    const customerEmail = session?.user?.email || customerEmailInput;
    const customerName = session?.user?.name || customerNameInput;
    const rOrder = await razorpay.orders.create({ amount: subtotal * 100, currency: 'INR', receipt: `cafe_${Date.now()}`, notes: { customerEmail, customerPhone: phone } });
    return NextResponse.json({ orderId: rOrder.id, amount: subtotal * 100, currency: 'INR', customerName, customerEmail, customerPhone: phone, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Unable to create payment order. Check Razorpay keys.' }, { status: 500 });
  }
}
