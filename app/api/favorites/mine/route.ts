import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Sign in to view favorites.' }, { status: 401 });
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    select: { productId: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ ids: favorites.map((x) => x.productId) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Sign in to save favorites.' }, { status: 401 });
  try {
    const body = await req.json();
    const productId = String(body.productId || '');
    const favorite = Boolean(body.favorite);
    if (!productId) return NextResponse.json({ error: 'Product is required.' }, { status: 400 });
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

    if (favorite) {
      await prisma.favorite.upsert({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId },
        update: {},
      });
    } else {
      await prisma.favorite.deleteMany({ where: { userId, productId } });
    }

    const count = await prisma.favorite.count({ where: { userId } });
    return NextResponse.json({ success: true, favorite, count });
  } catch (error) {
    console.error('Favorite update failed', error);
    return NextResponse.json({ error: 'Could not update favorite.' }, { status: 500 });
  }
}
