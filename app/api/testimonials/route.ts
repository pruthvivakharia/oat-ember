import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.testimonial.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ testimonials: rows });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to post a testimonial." },
        { status: 401 },
      );
    }
    const userId = (session?.user as any)?.id;
    if (!userId)
      return NextResponse.json(
        { error: "Sign in to write a testimonial." },
        { status: 401 },
      );
    const b = await req.json();
    const text = String(b.text || "").trim();
    const rating = Number(b.rating);
    const photoUrl =
      typeof b.photoUrl === "string" &&
      /^data:image\/(jpeg|png|webp);base64,/i.test(b.photoUrl) &&
      b.photoUrl.length < 250_000
        ? b.photoUrl
        : null;
    if (!text || text.length < 8 || text.length > 500)
      return NextResponse.json(
        { error: "Write between 8 and 500 characters." },
        { status: 400 },
      );
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return NextResponse.json(
        { error: "Choose a rating from 1 to 5." },
        { status: 400 },
      );
    const recent = await prisma.testimonial.findFirst({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent)
      return NextResponse.json(
        { error: "You can post one testimonial every 24 hours." },
        { status: 429 },
      );
    const row = await prisma.testimonial.create({
      data: {
        userId,
        name: session.user?.name || "O&E Regular",
        rating,
        text,
        photoUrl,
      },
    });
    return NextResponse.json({ testimonial: row });
  } catch (error) {
    console.error("Testimonial failed", error);
    return NextResponse.json(
      { error: "Could not save testimonial." },
      { status: 500 },
    );
  }
}
