import { prisma } from "@/lib/prisma";
import {
  blindHash,
  cleanPhone,
  decrypt,
  encrypt,
  randomToken,
} from "@/lib/crypto";
import {
  normalizeCustomizations,
  validateCustomerInput,
  validateFulfillment,
} from "@/lib/validation";

export async function calculateCart(items: unknown) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50)
    throw new Error("Your bag is empty or too large.");
  const ids = items.map((item) =>
    String((item as Record<string, unknown>)?.id || ""),
  );
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, available: true },
  });
  const map = new Map<string, (typeof products)[number]>(
    products.map((p: (typeof products)[number]) => [p.id, p] as const),
  );
  let subtotal = 0;
  const orderItems = items.map((raw) => {
    const item = raw as Record<string, unknown>;
    const p = map.get(String(item.id));
    const quantity = Number(item.quantity);
    if (!p || !Number.isInteger(quantity) || quantity < 1 || quantity > 10)
      throw new Error("One of the items in your bag is no longer available.");
    const customizations = normalizeCustomizations(
      item.customizations,
      p.category,
    );
    const unitPrice = p.price + customizations.shots * 50;
    subtotal += unitPrice * quantity;
    return {
      productId: p.id,
      name: p.name,
      quantity,
      unitPrice,
      customizations: JSON.stringify(customizations),
    };
  });
  return { subtotal, orderItems };
}

export async function createPaymentIntent(input: {
  razorpayOrderId: string;
  userId?: string | null;
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  fulfillment?: unknown;
  items?: unknown;
}) {
  const customer = validateCustomerInput({
    name: input.customerName,
    email: input.customerEmail,
    phone: input.customerPhone,
  });
  const fulfillment = validateFulfillment(input.fulfillment);
  const { subtotal, orderItems } = await calculateCart(input.items);
  const intent = await prisma.paymentIntent.create({
    data: {
      userId: input.userId || null,
      razorpayOrderId: input.razorpayOrderId,
      customerNameEncrypted: encrypt(customer.name)!,
      customerEmailEncrypted: encrypt(customer.email),
      customerPhoneEncrypted: encrypt(customer.phone)!,
      customerPhoneHash: blindHash(customer.phone),
      fulfillmentType: fulfillment.type,
      fulfillmentData: encrypt(JSON.stringify(fulfillment))!,
      itemsJson: JSON.stringify(orderItems),
      subtotal,
      currency: "INR",
      status: "CREATED",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  return { intent, customer, fulfillment, subtotal, orderItems };
}

export async function finalizePaymentIntent(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
}) {
  const intent = await prisma.paymentIntent.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });
  if (!intent) throw new Error("Payment session not found.");
  if (intent.expiresAt <= new Date())
    throw new Error("Payment session expired. Please start checkout again.");

  const existing = await prisma.order.findUnique({
    where: { razorpayPaymentId: input.razorpayPaymentId },
    include: { items: true },
  });
  if (existing) return { order: existing, created: false as const };

  const customerName = decrypt(intent.customerNameEncrypted) || "Customer";
  const customerEmail = decrypt(intent.customerEmailEncrypted) || null;
  const customerPhone = decrypt(intent.customerPhoneEncrypted) || "";
  const fulfillmentData = decrypt(intent.fulfillmentData) || "{}";
  const orderItems = JSON.parse(intent.itemsJson) as Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    customizations: string;
  }>;

  const result = await prisma.$transaction(async (tx) => {
    const db = tx as typeof prisma;
    const claimed = await db.paymentIntent.updateMany({
      where: { id: intent.id, status: "CREATED" },
      data: { status: "PAID", razorpayPaymentId: input.razorpayPaymentId },
    });
    if (claimed.count !== 1) {
      const already = await db.order.findUnique({
        where: { razorpayPaymentId: input.razorpayPaymentId },
        include: { items: true },
      });
      if (already) return { order: already, created: false as const };
      throw new Error(
        "This payment is already being finalized. Please check your order history.",
      );
    }
    const order = await db.order.create({
      data: {
        userId: intent.userId,
        customerNameEncrypted: intent.customerNameEncrypted,
        customerEmailEncrypted: intent.customerEmailEncrypted,
        customerPhoneEncrypted: intent.customerPhoneEncrypted,
        customerPhoneHash: intent.customerPhoneHash,
        fulfillmentType: intent.fulfillmentType,
        fulfillmentData: intent.fulfillmentData,
        subtotal: intent.subtotal,
        total: intent.subtotal,
        currency: intent.currency,
        status: "RECEIVED",
        paymentMethod: "RAZORPAY",
        paymentStatus: "PAID",
        razorpayOrderId: intent.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature || null,
        trackingToken: randomToken(32),
        items: { create: orderItems },
      },
      include: { items: true },
    });
    return { order, created: true as const };
  });

  return {
    ...result,
    customerName,
    customerEmail,
    customerPhone,
    fulfillmentData,
    orderItems,
  };
}
