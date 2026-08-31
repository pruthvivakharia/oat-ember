import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id;
  if (!id) return false;
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  return user?.role === "ADMIN";
}

function cleanProduct(body: any) {
  const name = String(body.name || "").trim();
  const slug = String(body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).trim();
  const description = String(body.description || "").trim();
  const category = String(body.category || "").trim();
  const image = String(body.image || "").trim();
  const price = Number(body.price);
  if (!name || !slug || !description || !category || !image || !Number.isInteger(price) || price < 0 || price > 100000) throw new Error("Invalid product details.");
  return { name, slug, description, category, image, price, available: body.available !== false };
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ products: await prisma.product.findMany({ orderBy: { createdAt: "asc" } }) });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await prisma.product.create({ data: cleanProduct(await req.json()) }), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create product." }, { status: 400 }); }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Product id is required." }, { status: 400 });
    const data = cleanProduct(body);
    return NextResponse.json(await prisma.product.update({ where: { id }, data }));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update product." }, { status: 400 }); }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  try { await prisma.product.update({ where: { id: String(id) }, data: { available: false } }); return NextResponse.json({ success: true }); }
  catch { return NextResponse.json({ error: "Product not found." }, { status: 404 }); }
}
