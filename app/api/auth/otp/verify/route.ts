import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { blindHash, cleanPhone, hashToken, randomToken } from "@/lib/crypto";
import { consumeIpRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ipLimit = consumeIpRateLimit(req, "otp-verify", 60, 60 * 60 * 1000);
    if (!ipLimit.allowed) {
      const response = NextResponse.json({ error: "Too many verification attempts. Please try again later." }, { status: 429 });
      response.headers.set("Retry-After", String(ipLimit.retryAfter));
      return response;
    }
    const body = await req.json();
    const phone = cleanPhone(body.phone) ?? "";
    const code = String(body.code || "").replace(/\D/g, "");
    const purpose = String(body.purpose || "").toUpperCase();
    if (
      !/^[6-9]\d{9}$/.test(phone) ||
      !/^\d{6}$/.test(code) ||
      !["REGISTRATION", "CASH_ORDER"].includes(purpose)
    )
      return NextResponse.json(
        { error: "Invalid OTP details." },
        { status: 400 },
      );
    const challenge = await prisma.otpChallenge.findFirst({
      where: { phoneHash: blindHash(phone), purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge)
      return NextResponse.json(
        { error: "OTP not found. Request a new one." },
        { status: 400 },
      );
    if (challenge.expiresAt <= new Date())
      return NextResponse.json(
        { error: "OTP expired. Request a new one." },
        { status: 400 },
      );
    if (challenge.attempts >= challenge.maxAttempts)
      return NextResponse.json(
        { error: "Too many incorrect attempts. Request a new OTP." },
        { status: 429 },
      );
    if (!(await bcrypt.compare(code, challenge.codeHash))) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Incorrect OTP." }, { status: 400 });
    }
    const token = randomToken(32);
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        verifiedAt: new Date(),
        verificationTokenHash: hashToken(token),
        verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    return NextResponse.json({
      success: true,
      verificationToken: token,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("OTP verification failed", error);
    return NextResponse.json(
      { error: "Could not verify OTP." },
      { status: 500 },
    );
  }
}
