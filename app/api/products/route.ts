import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
export async function GET(){const products=await prisma.product.findMany({where:{category:{not:'Merch'}},orderBy:{createdAt:'asc'}});const categories=['All',...Array.from(new Set(products.map(p=>p.category)))];return NextResponse.json({products,categories});}
