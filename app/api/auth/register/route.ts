import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const validPhone = (value: string) => /^[6-9]\d{9}$/.test(value.replace(/\D/g, ''));

export async function POST(req: Request) {
  try {
    const { name, email, password, phone } = await req.json();
    const normalized = String(email || '').toLowerCase().trim();
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!name?.trim() || !normalized || !password || password.length < 6 || !validPhone(cleanPhone)) {
      return NextResponse.json({ error: 'Name, valid email, 6+ character password and a valid 10-digit Indian mobile number are required.' }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { email: normalized } });
    if (exists) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    const user = await prisma.user.create({ data: { name: name.trim(), email: normalized, password: await bcrypt.hash(password, 12), phone: cleanPhone, role: 'CUSTOMER' } });
    return NextResponse.json({ id: user.id, email: user.email });
  } catch {
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  }
}
