'use client';
import { motion } from 'framer-motion';
import { ArrowUpRight, Heart, Plus } from 'lucide-react';
import { Product } from '@/types';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function MenuCard({ product, onCustomize, index = 0 }: { product: Product; onCustomize: (p: Product) => void; index?: number }) {
  const imageSrc = product.slug === 'matcha-cloud' ? '/images/matcha-cloud.svg' : product.image;
  const { status } = useSession();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (status === 'authenticated') {
        try {
          const r = await fetch('/api/favorites/mine', { cache: 'no-store' });
          const d = await r.json();
          if (!cancelled) setFav(Array.isArray(d.ids) && d.ids.includes(product.id));
          return;
        } catch {}
      }
      try {
        const ids: string[] = JSON.parse(localStorage.getItem('oat-ember-favorites') || '[]');
        if (!cancelled) setFav(ids.includes(product.id));
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, [product.id, status]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !fav;
    setFav(next);
    if (status === 'authenticated') {
      try {
        const r = await fetch('/api/favorites/mine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, favorite: next }) });
        if (!r.ok) throw new Error('favorite failed');
      } catch {
        setFav(!next);
      }
      return;
    }
    try {
      const ids: string[] = JSON.parse(localStorage.getItem('oat-ember-favorites') || '[]');
      const updated = next ? [...new Set([...ids, product.id])] : ids.filter((x) => x !== product.id);
      localStorage.setItem('oat-ember-favorites', JSON.stringify(updated));
    } catch { setFav(!next); }
  };

  return <motion.article initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ delay: index * .04 }} whileHover={{ y: -6 }} className="group overflow-hidden rounded-[1.7rem] border border-espresso/10 bg-white shadow-[0_18px_50px_rgba(30,20,15,.09)]">
    <div className="relative aspect-[1.05] overflow-hidden"><img src={imageSrc} alt={product.name} loading="lazy" decoding="async" onError={(e) => { if (product.slug === 'matcha-cloud') e.currentTarget.src = '/images/matcha-cloud.svg'; }} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" /><span className="absolute left-3 top-3 rounded-full bg-espresso/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-oat backdrop-blur">{product.category}</span><button onClick={toggle} aria-label={fav ? 'Remove favorite' : 'Save favorite'} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-oat/95 text-espresso shadow-lg"><Heart size={17} fill={fav ? 'currentColor' : 'none'} className={fav ? 'text-terracotta' : ''} /></button><span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-oat text-espresso transition group-hover:rotate-45"><ArrowUpRight size={17} /></span></div>
    <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="display text-2xl font-black tracking-[-.03em]">{product.name}</h3><p className="mt-1 text-sm leading-6 text-espresso/50">{product.description}</p></div><strong className="whitespace-nowrap text-lg font-black text-terracotta">₹{product.price}</strong></div><button onClick={() => onCustomize(product)} disabled={!product.available} className="btn mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-espresso py-3.5 text-sm font-black text-oat disabled:cursor-not-allowed disabled:opacity-35">{product.available ? <><Plus size={16} />Customize & add</> : 'Sold out'}</button></div>
  </motion.article>;
}
