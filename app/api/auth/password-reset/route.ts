import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { blindHash, cleanPhone, hashToken } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = cleanPhone(body.phone) ?? '';
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').replace(/\D/g, '');
    const verificationToken = String(body.verificationToken || '');
    const password = String(body.password || '');
    if (!/^[6-9]\d{9}$/.test(phone) || (code && !/^\d{6}$/.test(code)) || (!code && !verificationToken) || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Enter valid reset details.' }, { status: 400 });
    }

    const phoneHash = blindHash(phone);
    const user = await prisma.user.findUnique({ where: { phoneHash } });
    if (!user) return NextResponse.json({ error: 'If that account exists, use the verification code sent to its mobile.' }, { status: 400 });
    if (user.emailHash !== blindHash(email)) return NextResponse.json({ error: 'Email and mobile number do not match.' }, { status: 400 });

    const challenge = await prisma.otpChallenge.findFirst({
      where: { phoneHash, purpose: 'PASSWORD_RESET', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge || challenge.expiresAt <= new Date()) return NextResponse.json({ error: 'Verification code expired. Request a new one.' }, { status: 400 });

    if (!verificationToken) {
      if (!code || challenge.attempts >= challenge.maxAttempts || !(await bcrypt.compare(code, challenge.codeHash))) {
        if (challenge.attempts < challenge.maxAttempts) await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
        return NextResponse.json({ error: 'Incorrect verification code.' }, { status: 400 });
      }
      const token = crypto.randomBytes(32).toString('base64url');
      await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { verifiedAt: new Date(), verificationTokenHash: hashToken(token), verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
      return NextResponse.json({ success: true, verificationToken: token });
    }

    if (!challenge.verifiedAt || challenge.verificationTokenHash !== hashToken(verificationToken) || !challenge.verificationExpiresAt || challenge.verificationExpiresAt <= new Date()) {
      return NextResponse.json({ error: 'Password reset verification expired. Verify again.' }, { status: 400 });
    }

    await prisma.$transaction(async tx => {
      const consumed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new Error('Reset verification has already been used.');
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset failed', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not reset password. Please try again.' }, { status: 500 });
  }
}
