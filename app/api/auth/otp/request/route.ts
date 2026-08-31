import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { blindHash, cleanPhone } from "@/lib/crypto";
import { consumeIpRateLimit } from "@/lib/rate-limit";

const purposes = new Set(["REGISTRATION", "CASH_ORDER", "PASSWORD_RESET"]);
export async function POST(req: Request) {
  try {
    const ipLimit = consumeIpRateLimit(req, "otp-request", 30, 60 * 60 * 1000);
    if (!ipLimit.allowed) {
      const response = NextResponse.json({ error: "Too many OTP requests. Please try again later." }, { status: 429 });
      response.headers.set("Retry-After", String(ipLimit.retryAfter));
      return response;
    }
    const body = await req.json();
    const phone = cleanPhone(body.phone) ?? "";
    const purpose = String(body.purpose || "").toUpperCase();
    if (!/^[6-9]\d{9}$/.test(phone) || !purposes.has(purpose))
      return NextResponse.json(
        { error: "Valid phone and OTP purpose are required." },
        { status: 400 },
      );
    const phoneHash = blindHash(phone);
    const now = new Date();
    // Keep the OTP table small without storing plaintext phone/IP values.
    await prisma.otpChallenge.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }], createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });
    const last = await prisma.otpChallenge.findFirst({
      where: { phoneHash, purpose },
      orderBy: { createdAt: "desc" },
    });
    if (last && last.resendAvailableAt > now)
      return NextResponse.json(
        {
          error: `Please wait ${Math.ceil((last.resendAvailableAt.getTime() - now.getTime()) / 1000)} seconds before requesting another OTP.`,
        },
        { status: 429 },
      );
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const phoneCount = await prisma.otpChallenge.count({ where: { phoneHash, purpose, createdAt: { gte: since } } });
    if (phoneCount >= 8) {
      const response = NextResponse.json({ error: "OTP request limit reached. Try again later." }, { status: 429 });
      response.headers.set("Retry-After", "3600");
      return response;
    }
    const existingUser = await prisma.user.findUnique({ where: { phoneHash } });
    if (purpose === "REGISTRATION" && existingUser) {
      return NextResponse.json({ error: "This mobile number is already registered." }, { status: 409 });
    }
    if (purpose === "PASSWORD_RESET" && !existingUser) {
      // Keep the response generic to avoid account enumeration.
      return NextResponse.json({ success: true, expiresIn: 300, resendIn: 60 });
    }
    const code = String(crypto.randomInt(100000, 1000000));
    const challenge = await prisma.otpChallenge.create({
      data: {
        phoneHash,
        purpose,
        userId: existingUser?.id || null,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        resendAvailableAt: new Date(now.getTime() + 60 * 1000),
      },
    });
    const demoMode = String(process.env.DEMO_OTP_MODE ?? "true").toLowerCase() === "true";
    if (!demoMode) {
      const { sendOtpWhatsApp } = await import("@/lib/whatsapp");
      try {
        await sendOtpWhatsApp(phone, code);
      } catch (error) {
        await prisma.otpChallenge.delete({ where: { id: challenge.id } });
        throw error;
      }
    }
    return NextResponse.json({
      success: true,
      expiresIn: 300,
      resendIn: 60,
      ...(demoMode ? { demoMode: true, demoOtp: code } : {}),
    });
  } catch (error) {
    console.error("OTP request failed", error);
    return NextResponse.json(
      {
        error:
          "Could not send OTP. Check WhatsApp configuration and try again.",
      },
      { status: 500 },
    );
  }
}
