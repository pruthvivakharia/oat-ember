import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderForClient } from "@/lib/order-view";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const order = await prisma.order.findUnique({ where: { trackingToken: params.token }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json(orderForClient(order));
}
