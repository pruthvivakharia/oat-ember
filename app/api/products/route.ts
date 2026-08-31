import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET(){const products=await prisma.product.findMany({where:{category:{not:'Merch'}},orderBy:{createdAt:'asc'}});const categories=['All',...Array.from(new Set(products.map((p: (typeof products)[number])=>p.category)))];return NextResponse.json({products,categories});}
