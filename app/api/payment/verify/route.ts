import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOrderReceipt, sendOwnerNewOrder } from "@/lib/email";
import { publishOrderEvent } from "@/lib/order-events";

const validPhone = (value: string) =>
  /^[6-9]\d{9}$/.test(value.replace(/\D/g, ""));

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`)
      .digest("hex");
    if (!b.razorpay_signature || expected !== b.razorpay_signature)
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 },
      );
    const customerName = String(b.customerName ?? b.name ?? "").trim();
    const customerEmail = String(b.customerEmail ?? b.email ?? "").trim();
    const phone = String(b.customerPhone ?? b.phone ?? "").replace(/\D/g, "");
    if (!customerName || !validPhone(phone) || !customerEmail)
      return NextResponse.json(
        {
          error: "Name, email and a valid 10-digit phone number are required.",
        },
        { status: 400 },
      );

    const items = Array.isArray(b.items) ? b.items : [];
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i: any) => i.id) }, available: true },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const orderItems = items.map((i: any) => {
      const p = map.get(i.id);
      const quantity = Number(i.quantity);
      const shots = Number(i.customizations?.shots) || 0;
      if (
        !p ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 10 ||
        shots < 0 ||
        shots > 4
      )
        throw new Error("Product unavailable or invalid quantity");
      const unitPrice = p.price + shots * 50;
      subtotal += unitPrice * quantity;
      return {
        productId: p.id,
        name: p.name,
        quantity,
        unitPrice,
        customizations: JSON.stringify(i.customizations || {}),
      };
    });

    const session = await getServerSession(authOptions);
    const fulfillment = b.fulfillment;
    if (!fulfillment?.type)
      return NextResponse.json(
        { error: "Choose a handover method first." },
        { status: 400 },
      );
    const order = await prisma.order.create({
      data: {
        userId: (session?.user as any)?.id || null,
        customerName: customerName || session?.user?.name || "Guest",
        customerEmail,
        customerPhone: phone,
        fulfillmentType: fulfillment.type,
        fulfillmentData: JSON.stringify(fulfillment),
        subtotal,
        total: subtotal,
        currency: "INR",
        status: "RECEIVED",
        paymentMethod: "RAZORPAY",
        paymentStatus: "PAID",
        razorpayOrderId: b.razorpay_order_id,
        razorpayPaymentId: b.razorpay_payment_id,
        razorpaySignature: b.razorpay_signature,
        items: { create: orderItems },
      },
    });

    publishOrderEvent({
      type: "ORDER_CREATED",
      orderId: order.id,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerName,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });
    try {
      await sendOwnerNewOrder({
        orderId: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        total: order.total,
        paymentMethod: order.paymentMethod as "RAZORPAY" | "CASH",
        fulfillmentType: order.fulfillmentType,
        fulfillmentData: order.fulfillmentData,
        items: orderItems,
      });
    } catch (ownerEmailError) {
      console.error("Owner new-order email failed", ownerEmailError);
    }
    try {
      await sendOrderReceipt({
        orderId: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        total: order.total,
        paymentMethod: "RAZORPAY",
        fulfillmentType: order.fulfillmentType,
        items: orderItems,
      });
    } catch (emailError) {
      console.error("Receipt email failed", emailError);
    }
    return NextResponse.json({
      success: true,
      orderId: order.id,
      trackingToken: order.trackingToken,
      receiptEmail: order.customerEmail,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not save order." },
      { status: 500 },
    );
  }
}
