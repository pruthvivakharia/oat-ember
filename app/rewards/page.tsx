'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Coffee, Gift, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Rewards() {
  const { status } = useSession();
  const [stats, setStats] = useState({ orders: 0, qualifyingOrders: 0, rewardsEarned: 0, currentProgress: 0, rewardGoal: 10, visitsUntilNextReward: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') { setLoading(false); return; }
    fetch('/api/rewards/mine', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) setStats(d);
    }).finally(() => setLoading(false));
  }, [status]);

  const progress = Math.min(100, (stats.currentProgress / stats.rewardGoal) * 100);
  const message = stats.qualifyingOrders === 0
    ? 'Your first order starts the journey.'
    : stats.currentProgress === stats.rewardGoal
      ? 'Reward unlocked. Nice work.'
      : `${stats.visitsUntilNextReward} more ${stats.visitsUntilNextReward === 1 ? 'visit' : 'visits'} unlock the next free coffee.`;

  return <main className="grain min-h-screen"><div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8 md:py-16">
    <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-oat/40"><ArrowLeft size={14} /> Home</Link>
    <p className="eyebrow mt-12 text-matcha">The café club</p>
    <h1 className="display mt-3 text-6xl font-black leading-[.84] sm:text-8xl">COME BACK.<br /><span className="text-terracotta">GET REWARDED.</span></h1>

    {status !== 'authenticated' ? <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[.035] p-8"><h2 className="display text-3xl font-black">Your rewards start when you sign in.</h2><Link href="/login" className="mt-6 inline-flex rounded-2xl bg-terracotta px-5 py-3.5 text-sm font-black">Sign in</Link></div> : <>
      <div className="mt-10 overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#1a1613] p-6 sm:p-9">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow text-oat/30">Your real progress</span><p className="display mt-2 text-5xl font-black">{loading ? '—' : `${stats.currentProgress} `}<span className="text-oat/20">/ {stats.rewardGoal}</span></p><p className="mt-2 text-sm text-oat/40">{loading ? 'Loading your order history…' : message}</p><p className="mt-2 text-xs text-oat/25">{stats.qualifyingOrders} qualifying order{stats.qualifyingOrders === 1 ? '' : 's'} · {stats.rewardsEarned} reward{stats.rewardsEarned === 1 ? '' : 's'} earned</p></div><div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[10px] border-terracotta/30 bg-terracotta/10"><Coffee className="text-terracotta" size={32} /></div></div>
        <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-terracotta transition-all duration-700" style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3"><Reward icon={<Coffee />} title="Free coffee" text="Every 10 qualifying orders" /><Reward icon={<Gift />} title="Birthday treat" text="Coming from your member profile" /><Reward icon={<Sparkles />} title="Secret drops" text="Members only" /></div>
      <Link href="/menu" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-oat px-5 py-3.5 text-sm font-black text-espresso">Order toward your next reward <ArrowRight size={15} /></Link>
    </>}
  </div></main>;
}

function Reward({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <article className="rounded-[1.7rem] border border-white/10 bg-white/[.035] p-5"><div className="text-matcha">{icon}</div><h3 className="mt-4 font-black">{title}</h3><p className="mt-1 text-xs text-oat/35">{text}</p></article>; }
