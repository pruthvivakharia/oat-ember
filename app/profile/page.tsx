'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, ReceiptText, Gift, UserRound, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function Profile() {
  const { data: session, status } = useSession();
  const [orderCount, setOrderCount] = useState(0);
  const [rewardCount, setRewardCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      setOrderCount(0);
      setRewardCount(0);
      setFavoriteCount(0);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch('/api/rewards/mine', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null),
      fetch('/api/favorites/mine', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null),
    ])
      .then(([rewards, favorites]) => {
        setOrderCount(Number(rewards?.orders || 0));
        setRewardCount(Number(rewards?.rewardsEarned || 0));
        setFavoriteCount(Array.isArray(favorites?.ids) ? favorites.ids.length : 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  if (status === 'loading') return <main className="grain min-h-screen" />;

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8 md:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-oat/40"><ArrowLeft size={14} /> Home</Link>

        <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-terracotta">Your space</p>
            <h1 className="display mt-3 text-6xl font-black leading-[.84] sm:text-8xl">
              HELLO,<br /><span className="text-terracotta">{session?.user?.name?.split(' ')[0] || 'THERE'}.</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/orders" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-oat px-5 py-3.5 text-sm font-black text-espresso">Order history <ArrowRight size={15} /></Link>
            {status === 'authenticated' && (
              <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-terracotta/25 bg-terracotta/10 px-5 py-3.5 text-sm font-black text-terracotta transition hover:bg-terracotta/20">
                <LogOut size={15} /> Log out
              </button>
            )}
          </div>
        </div>

        {status !== 'authenticated' ? (
          <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
            <UserRound className="text-matcha" />
            <h2 className="display mt-4 text-3xl font-black">Sign in to unlock your café space.</h2>
            <Link href="/login" className="mt-6 inline-flex rounded-2xl bg-terracotta px-5 py-3.5 text-sm font-black">Sign in</Link>
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <Stat icon={<ReceiptText />} value={loading ? '—' : String(orderCount)} label="Orders" />
              <Stat icon={<Gift />} value={loading ? '—' : String(rewardCount)} label="Rewards earned" />
              <Stat icon={<Heart />} value={loading ? '—' : String(favoriteCount)} label="Saved" />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Link href="/orders" className="rounded-[1.7rem] border border-white/10 bg-white/[.035] p-6"><ReceiptText className="text-matcha" /><h3 className="mt-5 font-black">Orders & receipts</h3><p className="mt-1 text-xs leading-5 text-oat/35">Track, reorder and download every receipt.</p></Link>
              <Link href="/favorites" className="rounded-[1.7rem] border border-white/10 bg-white/[.035] p-6"><Heart className="text-terracotta" /><h3 className="mt-5 font-black">Saved favourites</h3><p className="mt-1 text-xs leading-5 text-oat/35">Keep your usuals one tap away.</p></Link>
              <Link href="/rewards" className="rounded-[1.7rem] border border-white/10 bg-white/[.035] p-6"><Gift className="text-matcha" /><h3 className="mt-5 font-black">The café club</h3><p className="mt-1 text-xs leading-5 text-oat/35">See your real progress and rewards.</p></Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-white/[.035] p-5"><div className="text-matcha">{icon}</div><p className="display mt-4 text-4xl font-black">{value}</p><p className="text-xs text-oat/35">{label}</p></div>;
}
