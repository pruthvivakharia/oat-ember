import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscribeToOrderEvents } from "@/lib/order-events";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id;
  const user = id ? await prisma.user.findUnique({ where: { id }, select: { role: true } }) : null;
  if (user?.role !== "ADMIN")
    return new Response("Unauthorized", { status: 401 });
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      send({ type: "CONNECTED", at: new Date().toISOString() });
      unsubscribe = subscribeToOrderEvents(send);
      heartbeat = setInterval(
        () => send({ type: "HEARTBEAT", at: new Date().toISOString() }),
        15000,
      );
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
