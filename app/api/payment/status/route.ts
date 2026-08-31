import { NextResponse } from 'next/server'; import { prisma } from '@/lib/prisma';
export const dynamic='force-dynamic';
export async function GET(){const setting=await prisma.cafeSetting.findFirst({orderBy:{updatedAt:'desc'}});const configured=Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET);return NextResponse.json({enabled:configured&&Boolean(setting?.onlinePaymentsEnabled??configured)});}
