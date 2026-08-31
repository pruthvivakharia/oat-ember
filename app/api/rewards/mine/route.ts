import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRewardStats } from '@/lib/rewards';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Sign in to view rewards.' }, { status: 401 });
  return NextResponse.json(await getRewardStats(userId), { headers: { 'Cache-Control': 'no-store' } });
}
