'use client';
import Link from 'next/link';
import {Home,LogIn,Menu as MenuIcon,ShieldCheck,ShoppingBag,UserRound,Utensils,Search} from 'lucide-react';
import {useCart} from '@/store/cart';
import {useSession,signOut} from 'next-auth/react';
import {AnimatePresence,motion} from 'framer-motion';
import CartDrawer from './CartDrawer';

export default function Navbar(){
 const {items,open,setOpen}=useCart();
 const {data:session}=useSession();
 const isAdmin=(session?.user as any)?.role==='ADMIN';
 const count=items.reduce((a,i)=>a+i.quantity,0);
 return <>
  <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#0e0c0b]/85 backdrop-blur-2xl">
   <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
    <Link href="/" className="group flex items-center gap-3">
      <span className="grid h-10 w-10 rotate-[-5deg] place-items-center rounded-xl bg-[#f7eee8] text-[#0e0c0b] shadow-[4px_4px_0_#e05a47] transition group-hover:rotate-0"><Utensils size={19}/></span>
      <span><span className="display block text-lg font-black leading-none tracking-[-.04em]">OAT<span className="text-terracotta">&</span>EMBER</span><span className="hidden text-[8px] font-black uppercase tracking-[.22em] text-oat/30 sm:block">coffee / curbside / office</span></span>
    </Link>
    <nav className="hidden items-center gap-8 md:flex">
      <a href="/#menu" className="text-xs font-black uppercase tracking-[.16em] text-oat/55 transition hover:text-oat">Menu</a>
      <a href="/#lanes" className="text-xs font-black uppercase tracking-[.16em] text-oat/55 transition hover:text-oat">Handover</a><Link href="/track" className="text-xs font-black uppercase tracking-[.16em] text-oat/55 transition hover:text-oat">Track order</Link>
      {isAdmin&&<Link href="/admin" className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-matcha"><ShieldCheck size={14}/> Ops room</Link>}
    </nav>
    <div className="flex items-center gap-2">
      {session ? <button onClick={()=>signOut({callbackUrl:'/'})} className="hidden rounded-full border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-black sm:block">Sign out</button> : <Link href="/login" className="hidden rounded-full bg-terracotta px-5 py-2.5 text-xs font-black text-white shadow-[3px_3px_0_rgba(255,255,255,.08)] sm:block">Log in</Link>}
      <button onClick={()=>setOpen(true)} aria-label="Open bag" className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[.04] transition hover:bg-white/[.08]"><ShoppingBag size={18}/>{count>0&&<span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-[9px] font-black">{count}</span>}</button>
    </div>
   </div>
  </header>
  <div className="mobile-nav fixed bottom-0 left-0 right-0 z-[45] hidden items-center justify-around border-t border-white/10 bg-[#12100e]/92 px-2 pt-2 backdrop-blur-2xl md:hidden">
    <MobileLink href="/" icon={<Home size={18}/>} label="Home"/>
    <MobileLink href="/#menu" icon={<MenuIcon size={18}/>} label="Menu"/>
    <button onClick={()=>setOpen(true)} className="relative -mt-7 grid h-14 w-14 place-items-center rounded-full border-4 border-[#0e0c0b] bg-terracotta text-white shadow-[0_8px_30px_rgba(224,90,71,.35)]"><ShoppingBag size={21}/>{count>0&&<span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-oat px-1 text-[9px] font-black text-espresso">{count}</span>}</button>
    {session ? <button onClick={()=>signOut({callbackUrl:'/'})} className="flex flex-col items-center gap-1 py-1 text-[9px] font-black uppercase tracking-wider text-oat/50"><UserRound size={18}/><span>Exit</span></button> : <Link href="/login" className="flex flex-col items-center gap-1 py-1 text-[9px] font-black uppercase tracking-wider text-oat/70"><LogIn size={18}/><span>Login</span></Link>}
    {isAdmin ? <Link href="/admin" className="flex flex-col items-center gap-1 py-1 text-[9px] font-black uppercase tracking-wider text-matcha"><ShieldCheck size={18}/><span>Ops</span></Link> : <Link href="/track" className="flex flex-col items-center gap-1 py-1 text-[9px] font-black uppercase tracking-wider text-oat/50"><SearchIcon/><span>Track</span></Link>}
  </div>
  <AnimatePresence>{open&&<CartDrawer/>}</AnimatePresence>
 </>
}
function SearchIcon(){return <Search size={18}/>}
function MobileLink({href,icon,label}:{href:string;icon:React.ReactNode;label:string}){return <Link href={href} className="flex flex-col items-center gap-1 py-1 text-[9px] font-black uppercase tracking-wider text-oat/50">{icon}<span>{label}</span></Link>}
