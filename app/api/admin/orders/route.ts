import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishOrderEvent } from "@/lib/order-events";
import { sendCustomerStatusEmail } from "@/lib/email";

async function guard() {
  const s = await getServerSession(authOptions);
  return s?.user && (s.user as any).role === "ADMIN";
}

export async function GET() {
  if (!(await guard()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todays = orders.filter((o) => new Date(o.createdAt) >= today);
  const revenue = todays.reduce((a, o) => a + o.total, 0);
  const counts = new Map<string, number>();
  todays.forEach((o) =>
    o.items.forEach((i) =>
      counts.set(i.name, (counts.get(i.name) || 0) + i.quantity),
    ),
  );
  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return NextResponse.json({ orders, revenue, volume: todays.length, top });
}

export async function PATCH(req: Request) {
  if (!(await guard()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  if (!["RECEIVED", "BREWING", "PACKED", "COMPLETED"].includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (existing.status === status) return NextResponse.json(existing);
  const allowedNext: Record<string, string> = {
    RECEIVED: "BREWING",
    BREWING: "PACKED",
    PACKED: "COMPLETED",
  };
  if (allowedNext[existing.status] !== status)
    return NextResponse.json(
      {
        error: `Order must move from ${existing.status} to ${allowedNext[existing.status] || "COMPLETED"}.`,
      },
      { status: 400 },
    );
  const order = await prisma.order.update({ where: { id }, data: { status } });
  publishOrderEvent({
    type: "ORDER_STATUS_CHANGED",
    orderId: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    total: order.total,
    paymentMethod: order.paymentMethod,
  });
  if (status === "BREWING" || status === "PACKED" || status === "COMPLETED") {
    try {
      await sendCustomerStatusEmail({
        orderId: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status,
        fulfillmentType: order.fulfillmentType,
        total: order.total,
      });
    } catch (emailError) {
      console.error(`Customer ${status} email failed`, emailError);
    }
  }
  return NextResponse.json(order);
}
