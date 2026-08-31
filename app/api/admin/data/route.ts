import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

async function guard() { const s=await getServerSession(authOptions); const id=(s?.user as any)?.id; if(!id)return false; return (await prisma.user.findUnique({where:{id},select:{role:true}}))?.role==='ADMIN'; }
const dayStart=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
export async function GET(){
 if(!(await guard()))return NextResponse.json({error:'Unauthorized'},{status:401});
 const [users,orders,products,offers,staff,settings,qr,reviews]=await Promise.all([
  prisma.user.findMany({where:{role:'CUSTOMER'},orderBy:{createdAt:'desc'},take:500}),
  prisma.order.findMany({include:{items:true},orderBy:{createdAt:'desc'},take:500}),
  prisma.product.findMany({orderBy:{createdAt:'asc'}}),prisma.offer.findMany({orderBy:{createdAt:'desc'}}),
  prisma.staff.findMany({orderBy:[{active:'desc'},{name:'asc'}]}),prisma.cafeSetting.findFirst({orderBy:{updatedAt:'desc'}}),
  prisma.qrEntry.findMany({orderBy:{createdAt:'desc'}}),prisma.testimonial.findMany({orderBy:{createdAt:'desc'},take:100})
 ]);
 const safeOrders=orders.map(o=>({id:o.id,customerName:decrypt(o.customerNameEncrypted)||'Customer',customerEmail:decrypt(o.customerEmailEncrypted)||'',customerPhone:decrypt(o.customerPhoneEncrypted)||'',fulfillmentType:o.fulfillmentType,fulfillmentData:(()=>{try{return JSON.parse(decrypt(o.fulfillmentData)||'{}')}catch{return {}}})(),subtotal:o.subtotal,total:o.total,status:o.status,paymentMethod:o.paymentMethod,paymentStatus:o.paymentStatus,trackingToken:o.trackingToken,createdAt:o.createdAt.toISOString(),updatedAt:o.updatedAt.toISOString(),items:o.items.map(i=>({id:i.id,productId:i.productId,name:i.name,quantity:i.quantity,unitPrice:i.unitPrice,customizations:i.customizations}))}));
 const today=dayStart(),completed=orders.filter(o=>o.status==='COMPLETED'),todays=orders.filter(o=>o.createdAt>=today);
 const itemMap=new Map<string,{quantity:number;revenue:number}>(); orders.forEach(o=>o.items.forEach(i=>{const x=itemMap.get(i.name)||{quantity:0,revenue:0};x.quantity+=i.quantity;x.revenue+=i.quantity*i.unitPrice;itemMap.set(i.name,x);}));
 const paymentMap=new Map<string,{orders:number;revenue:number}>(); completed.forEach(o=>{const x=paymentMap.get(o.paymentMethod)||{orders:0,revenue:0};x.orders++;x.revenue+=o.total;paymentMap.set(o.paymentMethod,x);});
 const customerMap=new Map<string,{name:string;phone:string;orders:number;spent:number;points:number;lastOrder:string|null}>();
 orders.forEach(o=>{if(!o.userId)return;const row=customerMap.get(o.userId)||{name:decrypt(o.customerNameEncrypted)||'Customer',phone:decrypt(o.customerPhoneEncrypted)||'',orders:0,spent:0,points:0,lastOrder:null};row.orders++;if(o.status==='COMPLETED'){row.spent+=o.total;row.points+=Math.floor(o.total/10);}row.lastOrder=!row.lastOrder||o.createdAt>new Date(row.lastOrder)?o.createdAt.toISOString():row.lastOrder;customerMap.set(o.userId,row);});
 const customers=users.map(u=>{const row=customerMap.get(u.id);const history=safeOrders.filter(o=>orders.find(x=>x.id===o.id)?.userId===u.id);return{id:u.id,name:row?.name||decrypt(u.nameEncrypted)||'Customer',email:decrypt(u.emailEncrypted)||'',phone:row?.phone||decrypt(u.phoneEncrypted)||'',createdAt:u.createdAt.toISOString(),orderCount:row?.orders||0,completedOrders:row?.orders?history.filter(o=>o.status==='COMPLETED').length:0,totalSpent:row?.spent||0,loyaltyPoints:row?.points||0,lastOrder:row?.lastOrder||null,history:history.slice(0,50)};}).filter(c=>c.orderCount>0);
 const topCustomers=Array.from(customerMap.entries()).map(([id,v])=>({id,...v})).sort((a,b)=>b.orders-a.orders||b.spent-a.spent).slice(0,10);
 return NextResponse.json({orders:safeOrders,products,offers,staff,settings,qr,reviews,customers,stats:{revenue:completed.filter(o=>o.createdAt>=today).reduce((s,o)=>s+o.total,0),todayOrders:todays.length,completedToday:todays.filter(o=>o.status==='COMPLETED').length,pendingToday:todays.filter(o=>['RECEIVED','BREWING','PACKED'].includes(o.status)).length,customers:customers.length,products:products.length},analytics:{items:Array.from(itemMap.entries()).map(([name,v])=>({name,...v})).sort((a,b)=>b.revenue-a.revenue),payments:Array.from(paymentMap.entries()).map(([method,v])=>({method,...v})).sort((a,b)=>b.revenue-a.revenue),topCustomers}});
}
