'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [f, setF] = useState({ email: '', phone: '', code: '', password: '' });
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const phoneOk = /^[6-9]\d{9}$/.test(f.phone);

  useEffect(() => { if (!resendIn) return; const id = window.setInterval(() => setResendIn(v => Math.max(0, v - 1)), 1000); return () => window.clearInterval(id); }, [resendIn]);

  const send = async () => {
    setMessage('');
    if (!phoneOk) { setMessage('Enter a valid 10-digit Indian mobile number.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: f.phone, purpose: 'PASSWORD_RESET' }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not send code.');
      setSent(true); setDemoOtp(d.demoOtp || ''); setResendIn(d.resendIn || 60); setMessage(d.demoMode ? 'Demo mode: use the verification code shown below.' : 'If the account exists, a verification code has been sent to the mobile number.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not send code.'); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setMessage(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/password-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email, phone: f.phone, code: f.code, password: f.password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not verify code.');
      if (d.verificationToken) { setToken(d.verificationToken); setMessage('Mobile verified. Set your new password and save it.'); }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not verify code.'); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    setMessage(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/password-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email, phone: f.phone, verificationToken: token, password: f.password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not reset password.');
      setMessage('Password updated. You can sign in with your new password now.');
      setTimeout(() => { window.location.href = '/login'; }, 900);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not reset password.'); }
    finally { setBusy(false); }
  };

  return <main className="grain min-h-[calc(100svh-72px)] px-4 py-10 text-oat sm:px-6 md:grid md:place-items-center md:py-16"><section className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#171310] p-6 shadow-editorial sm:p-9"><Link href="/login" className="inline-flex items-center gap-2 text-xs font-black text-oat/40"><ArrowLeft size={14}/> Back to sign in</Link><p className="eyebrow mt-10 text-terracotta">Account recovery</p><h1 className="display mt-3 text-5xl font-black leading-[.9]">Reset your<br/><span className="text-terracotta">password.</span></h1><p className="mt-4 max-w-lg text-sm leading-6 text-oat/45">We use your registered email and mobile number together so a reset cannot be completed with only one piece of account information.</p><div className="mt-8 space-y-4"><Field label="Email address" icon={<Mail size={16}/>}><input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} className="field auth-field" placeholder="you@example.com"/></Field><Field label="Mobile number" icon={<Phone size={16}/>}><input inputMode="numeric" maxLength={10} value={f.phone} onChange={e=>{setF({...f,phone:e.target.value.replace(/\D/g,'').slice(0,10)});setSent(false);setToken('')}} className="field auth-field" placeholder="10-digit mobile number"/></Field>{!sent&&!token&&<button onClick={send} disabled={busy||!phoneOk} className="btn flex w-full items-center justify-center gap-2 rounded-2xl bg-terracotta py-4 font-black disabled:opacity-40">{busy?'Sending…':'Send verification code'}<MessageCircle size={16}/></button>}{sent&&!token&&<>{demoOtp&&<div className="rounded-2xl border border-terracotta/25 bg-terracotta/10 p-4"><p className="text-[9px] font-black uppercase tracking-[.18em] text-terracotta">Demo verification code</p><p className="display mt-1 text-3xl font-black tracking-[.18em] text-oat">{demoOtp}</p><p className="mt-1 text-[10px] text-oat/40">Fresh code · expires in 5 minutes</p></div>}<Field label="6-digit code" icon={<ShieldCheck size={16}/>}><input inputMode="numeric" maxLength={6} value={f.code} onChange={e=>setF({...f,code:e.target.value.replace(/\D/g,'').slice(0,6)})} className="field auth-field" placeholder="123456"/></Field><Field label="New password" icon={<LockKeyhole size={16}/>}><input type="password" minLength={8} maxLength={128} value={f.password} onChange={e=>setF({...f,password:e.target.value})} className="field auth-field" placeholder="At least 8 characters"/></Field><div className="flex items-center justify-between gap-3 text-xs text-oat/35"><span>{resendIn?`Resend available in ${resendIn}s`:'You can request a new code.'}</span><button onClick={send} disabled={resendIn>0||busy} className="font-black text-matcha disabled:opacity-40">Resend</button></div><button onClick={verify} disabled={busy||f.code.length!==6||f.password.length<8} className="btn flex w-full items-center justify-center gap-2 rounded-2xl bg-terracotta py-4 font-black disabled:opacity-40">{busy?'Checking…':'Verify code'}<Check size={16}/></button></>}{token&&<><div className="rounded-2xl border border-matcha/20 bg-matcha/10 p-4 text-sm font-bold text-matcha">Mobile verified. Your reset window is open for 10 minutes.</div><Field label="New password" icon={<LockKeyhole size={16}/>}><input type="password" minLength={8} maxLength={128} value={f.password} onChange={e=>setF({...f,password:e.target.value})} className="field auth-field" placeholder="At least 8 characters"/></Field><button onClick={reset} disabled={busy||f.password.length<8} className="btn flex w-full items-center justify-center gap-2 rounded-2xl bg-oat py-4 font-black text-espresso disabled:opacity-40">{busy?'Saving…':'Save new password'}<ArrowRight size={16}/></button></>}</div>{message&&<p role="status" className="mt-5 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm font-bold text-oat/70">{message}</p>}<div className="mt-6 flex gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs leading-5 text-oat/45"><ShieldCheck size={16} className="shrink-0 text-matcha"/><span>Your password is stored only as a one-way bcrypt hash. It cannot be read back from the database.</span></div></section></main>
}
function Field({label,icon,children}:{label:string;icon:React.ReactNode;children:React.ReactNode}){return <label className="block"><span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-oat/35">{icon}{label}</span>{children}</label>}
