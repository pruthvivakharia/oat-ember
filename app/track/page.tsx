'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CheckCircle2,Coffee,Clock3,PackageCheck,Search,Truck,Building2,LogIn} from 'lucide-react';
import {useSession} from 'next-auth/react';

type Item={name:string;quantity:number;unitPrice:number};
type Order={id:string;trackingToken:string;customerName:string;fulfillmentType:'VEHICLE'|'CORPORATE';total:number;paymentMethod:string;paymentStatus:string;status:'RECEIVED'|'BREWING'|'PACKED'|'COMPLETED';createdAt:string;items:Item[]};
const statusLabel=(s:Order['status'])=>s==='COMPLETED'?'READY':s;
const statusIcon=(s:Order['status'])=>s==='RECEIVED'?Clock3:s==='BREWING'?Coffee:s==='PACKED'?PackageCheck:CheckCircle2;

export default function TrackPage(){
 const {data:session,status:sessionStatus}=useSession();
 const [token,setToken]=useState(''); const [saved,setSaved]=useState(''); const [orders,setOrders]=useState<Order[]>([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
 useEffect(()=>{const t=localStorage.getItem('oat-ember-last-order')||'';setSaved(t);if(t)setToken(t)},[]);
 useEffect(()=>{if(sessionStatus!=='authenticated')return;fetch('/api/orders/mine',{cache:'no-store'}).then(async r=>{const d=await r.json();if(r.ok)setOrders(d.orders||[])}).catch(()=>{})},[sessionStatus]);
 const openToken=()=>{const clean=token.trim();if(!clean){setError('Paste your order tracking code first.');return}window.location.href=`/track/${clean}`};
 return <main className="grain min-h-[calc(100svh-72px)] bg-espresso px-4 py-8 text-oat sm:px-6 md:py-14">
  <div className="mx-auto max-w-6xl">
   <div className="max-w-2xl"><p className="eyebrow text-matcha">Order desk</p><h1 className="display mt-3 text-5xl font-black leading-[.9] sm:text-7xl">Your coffee.<br/><span className="text-terracotta">Where is it?</span></h1><p className="mt-5 text-sm leading-6 text-oat/45">Come back here anytime. Signed-in customers see their recent orders, while guest orders can be reopened with the tracking code from the receipt or confirmation screen.</p></div>
   <div className="mt-8 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
    <section className="rounded-[2rem] border border-white/10 bg-white/[.035] p-5 sm:p-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-terracotta text-white"><Search size={18}/></div><div><p className="eyebrow text-oat/30">Guest tracking</p><h2 className="display text-2xl font-black">Open an order</h2></div></div><input value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste tracking code" className="field mt-5"/><button onClick={openToken} className="btn mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-terracotta py-4 font-black">Track order <ArrowRight size={16}/></button>{saved&&<p className="mt-3 text-xs text-oat/30">Your latest order is saved on this device. You can reopen it anytime.</p>}{error&&<p className="mt-3 rounded-xl bg-terracotta/10 p-3 text-xs text-terracotta">{error}</p>}
     {sessionStatus!=='authenticated'&&<Link href="/login" className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] py-3.5 text-sm font-black text-oat/65"><LogIn size={16}/> Sign in to keep all orders together</Link>}
    </section>
    <section className="rounded-[2rem] border border-white/10 bg-[#f0e4dc] p-5 text-espresso sm:p-7"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow text-terracotta">{session?'Your order history':'Your latest order'}</p><h2 className="display mt-2 text-3xl font-black">{session?'Recent orders':'Come back whenever.'}</h2></div>{session&&<span className="rounded-full bg-matcha/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-matcha">Signed in</span>}</div>
      {sessionStatus==='loading'?<p className="mt-8 text-sm text-espresso/40">Loading orders…</p>:orders.length>0?<div className="mt-6 space-y-3">{orders.map(o=>{const Icon=statusIcon(o.status);return <Link key={o.id} href={`/track/${o.trackingToken}`} className="group block rounded-2xl border border-espresso/10 bg-white/60 p-4 transition hover:-translate-y-0.5 hover:border-terracotta/40"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-espresso/35">#{o.id.slice(-6).toUpperCase()}</p><p className="mt-1 font-black">₹{o.total} · {o.fulfillmentType==='VEHICLE'?'Curbside':'Office'}</p></div><span className="flex items-center gap-1.5 rounded-full bg-matcha/10 px-3 py-1.5 text-[10px] font-black text-matcha"><Icon size={13}/>{statusLabel(o.status)}</span></div><p className="mt-3 text-xs text-espresso/45">{new Date(o.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})} · {o.items.reduce((n,i)=>n+i.quantity,0)} item(s)</p></Link>})}</div>:<div className="mt-8 rounded-3xl border border-dashed border-espresso/15 p-6 text-center"><Truck className="mx-auto text-matcha"/><p className="mt-3 font-black">No signed-in orders yet.</p><p className="mt-2 text-sm text-espresso/45">Place an order and it will appear here automatically.</p></div>}
    </section>
   </div>
  </div>
 </main>
}
