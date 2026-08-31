'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart } from 'lucide-react';
import { useSession } from 'next-auth/react';
import MenuCard from '@/components/MenuCard';
import CustomizerModal from '@/components/CustomizerModal';
import { Product } from '@/types';

export default function FavoritesPage() {
  const { status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/products', { cache: 'no-store' }).then((r) => r.json()).then((d) => setProducts(d.products || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/favorites/mine', { cache: 'no-store' }).then((r) => r.json()).then((d) => setIds(Array.isArray(d.ids) ? d.ids : [])).catch(() => setIds([]));
      return;
    }
    if (status === 'unauthenticated') {
      try { setIds(JSON.parse(localStorage.getItem('oat-ember-favorites') || '[]')); } catch { setIds([]); }
    }
  }, [status]);

  const favorites = products.filter((p) => ids.includes(p.id));
  return <main className="grain min-h-screen"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-8 md:py-12"><Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-oat/40"><ArrowLeft size={14} /> Home</Link><div className="mt-8 flex items-end justify-between gap-4"><div><p className="eyebrow text-matcha">Saved for later</p><h1 className="display mt-3 text-6xl font-black leading-[.85]">Your<br /><span className="text-terracotta">favorites.</span></h1><p className="mt-4 text-xs text-oat/35">{status === 'authenticated' ? 'Synced to your account across devices.' : 'Saved on this device. Sign in to sync them across devices.'}</p></div><Heart className="hidden text-terracotta sm:block" size={42} fill="currentColor" /></div>{favorites.length ? <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((p, i) => <MenuCard key={p.id} product={p} onCustomize={setSelected} index={i} />)}</div> : <div className="mt-10 rounded-[2rem] border border-dashed border-white/10 bg-white/[.025] p-10 text-center"><Heart className="mx-auto text-oat/30" /><h2 className="display mt-4 text-3xl font-black">Nothing saved yet.</h2><p className="mt-2 text-sm text-oat/40">Tap the heart on a menu item and it will stay here.</p><Link href="/menu" className="btn mt-6 inline-flex rounded-2xl bg-terracotta px-5 py-3.5 text-sm font-black">Explore menu</Link></div>}</div><CustomizerModal product={selected} onClose={() => setSelected(null)} /></main>;
}
