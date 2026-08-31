import { NextResponse } from "next/server";
import { verifyWhatsAppWebhookSignature } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Meta calls GET during webhook setup. The verify token is a secret chosen by
 * us and must match the value entered in Meta's Webhooks configuration.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    expectedToken &&
    token === expectedToken &&
    challenge
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * Meta sends WhatsApp message/status notifications here. We acknowledge the
 * webhook quickly after authenticating it. Business logic can be added later
 * without exposing the access token to the browser.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ received: true });
    }

    // Keep the initial integration intentionally side-effect free. The payload
    // is logged without access tokens so we can inspect Meta events locally.
    if (process.env.NODE_ENV !== "production") {
      console.info("WhatsApp webhook event", JSON.stringify(payload));
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
}
