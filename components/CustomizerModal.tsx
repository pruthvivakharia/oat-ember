'use client';
import {useState} from 'react';
import {X,Minus,Plus} from 'lucide-react';
import {Product} from '@/types';
import {useCart} from '@/store/cart';
import {motion} from 'framer-motion';

export default function CustomizerModal({product,onClose}:{product:Product|null;onClose:()=>void}){
 const add=useCart(s=>s.add);
 const [sweetness,setSweetness]=useState<0|50|100>(50);
 const [shots,setShots]=useState(0);
 if(!product)return null;
 return <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 backdrop-blur-sm md:place-items-center md:p-6" onClick={onClose}>
  <motion.div initial={{y:80,opacity:0}} animate={{y:0,opacity:1}} onClick={e=>e.stopPropagation()} className="w-full max-w-lg rounded-t-[2rem] border border-white/10 bg-[#211C18] p-6 md:rounded-[2rem]">
   <div className="flex justify-between"><div><p className="text-xs uppercase tracking-[.25em] text-matcha">Customize</p><h2 className="display mt-1 text-3xl font-black">{product.name}</h2></div><button onClick={onClose} className="rounded-full bg-white/10 p-2"><X size={18}/></button></div>
   <p className="mt-3 text-sm leading-6 text-oat/45">Make it yours with sweetness and an optional espresso boost.</p>
   <div className="mt-7 space-y-6">
    <Option title="Sweetness"><div className="grid grid-cols-3 gap-2">{([0,50,100] as const).map(x=><button key={x} onClick={()=>setSweetness(x)} className={`rounded-xl border px-3 py-3 text-sm ${sweetness===x?'border-terracotta bg-terracotta/20':'border-white/10'}`}>{x}%</button>)}</div></Option>
    <Option title="Extra espresso"><div className="flex items-center justify-between rounded-2xl border border-white/10 p-3"><span className="text-sm text-oat/60">₹50 per shot</span><div className="flex items-center gap-4"><button onClick={()=>setShots(Math.max(0,shots-1))} className="rounded-full bg-white/10 p-2"><Minus size={14}/></button><b>{shots}</b><button onClick={()=>setShots(Math.min(4,shots+1))} className="rounded-full bg-white/10 p-2"><Plus size={14}/></button></div></div></Option>
   </div>
   <button onClick={()=>{add(product,{sweetness,shots});onClose()}} className="btn mt-7 w-full rounded-2xl bg-terracotta py-4 font-black">Add to bag · ₹{product.price+shots*50}</button>
  </motion.div>
 </div>
}
function Option({title,children}:{title:string;children:React.ReactNode}){return <section><h3 className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-oat/45">{title}</h3>{children}</section>}
