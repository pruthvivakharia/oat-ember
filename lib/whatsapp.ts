import crypto from "crypto";
import { prisma } from "@/lib/prisma";

type Template = { name: string; language?: string; parameters: string[] };

type OrderWhatsAppInput = {
  orderId: string;
  phone: string;
  name: string;
  total: number;
  status: "ACCEPTED" | "PREPARED" | "READY";
};

const digits = (value: string) => value.replace(/\D/g, "");

function toWhatsAppPhone(phone: string) {
  const clean = digits(phone);
  if (clean.length === 10) return `91${clean}`;
  if (clean.length === 12 && clean.startsWith("91")) return clean;
  throw new Error("Invalid WhatsApp phone number");
}

function config() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId, version };
}

async function sendTemplate(to: string, template: Template) {
  const cfg = config();
  if (!cfg) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[WhatsApp dev] ${template.name} -> ${to.replace(/\d(?=\d{4})/g, "•")}`);
      return { providerId: `dev_${Date.now()}` };
    }
    throw new Error("WhatsApp Cloud API is not configured");
  }

  const response = await fetch(
    `https://graph.facebook.com/${cfg.version}/${cfg.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsAppPhone(to),
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language || "en_US" },
          ...(template.parameters.length
            ? {
                components: [
                  {
                    type: "body",
                    parameters: template.parameters.map((text) => ({
                      type: "text",
                      text,
                    })),
                  },
                ],
              }
            : {}),
        },
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("WhatsApp provider rejected message", {
      status: response.status,
      code: data?.error?.code,
      type: data?.error?.type,
      message: data?.error?.message,
    });
    throw new Error("WhatsApp message could not be sent");
  }

  return { providerId: data?.messages?.[0]?.id as string | undefined };
}

export async function sendOtpWhatsApp(phone: string, code: string) {
  return sendTemplate(phone, {
    name: process.env.WHATSAPP_OTP_TEMPLATE || "oat_ember_otp",
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
    parameters: [code],
  });
}

export async function sendOrderWhatsApp(input: OrderWhatsAppInput) {
  const code = input.orderId.slice(-6).toUpperCase();
  const names = {
    ACCEPTED: process.env.WHATSAPP_ORDER_ACCEPTED_TEMPLATE || "oat_ember_order_accepted",
    PREPARED: process.env.WHATSAPP_ORDER_PREPARED_TEMPLATE || "oat_ember_order_prepared",
    READY: process.env.WHATSAPP_ORDER_READY_TEMPLATE || "oat_ember_order_ready",
  };

  return sendTemplate(input.phone, {
    name: names[input.status],
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
    parameters: [input.name, code, `₹${input.total}`],
  });
}

/**
 * Sends a new-order alert to the café owner's WhatsApp number.
 * This is intentionally separate from customer status notifications so the
 * owner's number can be changed later without changing order logic.
 */
export async function sendOwnerNewOrderWhatsApp(input: {
  orderId: string;
  customerName: string;
  total: number;
}) {
  const ownerPhone = process.env.WHATSAPP_OWNER_PHONE;
  if (!ownerPhone) return { skipped: true as const };

  const code = input.orderId.slice(-6).toUpperCase();
  const result = await sendTemplate(ownerPhone, {
    name:
      process.env.WHATSAPP_OWNER_ORDER_TEMPLATE ||
      process.env.WHATSAPP_ORDER_ACCEPTED_TEMPLATE ||
      "oat_ember_order_accepted",
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
    parameters: [input.customerName, code, `₹${input.total}`],
  });

  return { skipped: false as const, ...result };
}

export async function queueAndSendOrderWhatsApp(input: OrderWhatsAppInput) {
  const event = `ORDER_${input.status}`;
  const existing = await prisma.orderNotification.findUnique({
    where: {
      orderId_channel_event: {
        orderId: input.orderId,
        channel: "WHATSAPP",
        event,
      },
    },
  });
  if (existing?.status === "SENT") return true;

  const row =
    existing ||
    (await prisma.orderNotification.create({
      data: {
        orderId: input.orderId,
        channel: "WHATSAPP",
        event,
        status: "PENDING",
      },
    }));

  try {
    const result = await sendOrderWhatsApp(input);
    await prisma.orderNotification.update({
      where: { id: row.id },
      data: {
        status: "SENT",
        providerId: result.providerId,
        sentAt: new Date(),
        attempts: { increment: 1 },
        lastError: null,
      },
    });
    return true;
  } catch (error) {
    await prisma.orderNotification.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: error instanceof Error ? error.message : "WhatsApp send failed",
      },
    });
    console.error("WhatsApp notification failed", error);
    return false;
  }
}

/**
 * Verify Meta's webhook signature. The raw request body must be used; parsing
 * JSON before calculating the HMAC can invalidate the signature.
 */
export function verifyWhatsAppWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;

  const received = signatureHeader.slice("sha256=".length);
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(received, "hex"),
  );
}
