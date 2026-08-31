import { NextResponse } from 'next/server'; import { prisma } from '@/lib/prisma';
export const dynamic='force-dynamic';
export async function GET(){const now=new Date();const offers=await prisma.offer.findMany({where:{active:true,AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{endsAt:null},{endsAt:{gte:now}}]}]},orderBy:{createdAt:'desc'}});return NextResponse.json({offers});}
