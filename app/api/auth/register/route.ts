import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { blindHash, cleanPhone, encrypt, normalizeEmail, hashToken } from '@/lib/crypto';
import { validateCustomerInput } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone } = validateCustomerInput(body);
    const password = String(body.password || '');
    const verificationToken = String(body.phoneVerificationToken || '');
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Use a password between 8 and 128 characters.' }, { status: 400 });
    }
    if (!verificationToken) {
      return NextResponse.json({ error: 'Verify your mobile number before creating the account.' }, { status: 400 });
    }

    const emailHash = blindHash(email!);
    const phoneHash = blindHash(phone);
    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        phoneHash,
        purpose: 'REGISTRATION',
        verificationTokenHash: hashToken(verificationToken),
        verifiedAt: { not: null },
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge || !challenge.verificationExpiresAt || challenge.verificationExpiresAt <= new Date()) {
      return NextResponse.json({ error: 'Your mobile verification has expired. Verify again.' }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { emailHash } });
    if (existingEmail) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    const existingPhone = await prisma.user.findUnique({ where: { phoneHash } });
    if (existingPhone) return NextResponse.json({ error: 'An account with this phone number already exists.' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const consumed = await tx.otpChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error('This verification has already been used.');
      return tx.user.create({
        data: {
          nameEncrypted: encrypt(name),
          emailEncrypted: encrypt(email),
          emailHash,
          phoneEncrypted: encrypt(phone)!,
          phoneHash,
          passwordHash,
          role: 'CUSTOMER',
          phoneVerifiedAt: new Date(),
        },
        select: { id: true },
      });
    });

    return NextResponse.json({ success: true, id: user.id, email });
  } catch (error) {
    console.error('Registration failed', error instanceof Error ? error.message : 'unknown error');
    const message = error instanceof Error && /already been used|expired|valid|password|mobile verification/i.test(error.message)
      ? error.message
      : 'Could not create account. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
