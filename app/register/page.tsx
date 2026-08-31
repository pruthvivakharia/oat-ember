'use client';
import { FormEvent, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Coffee, LockKeyhole, Mail, Phone, ShieldCheck, UserRound, MessageCircle } from 'lucide-react';

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [error, setError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const router = useRouter();
  const phoneOk = /^[6-9]\d{9}$/.test(f.phone);
  const update = (k: keyof typeof f, v: string) => setF(x => ({ ...x, [k]: k === 'phone' ? v.replace(/\D/g, '').slice(0, 10) : v }));

  useEffect(() => {
    fetch('/api/auth/providers').then(r => r.ok ? r.json() : null).then(d => setGoogleAvailable(Boolean(d?.google))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!resendIn) return;
    const id = window.setInterval(() => setResendIn(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  const requestOtp = async () => {
    setError(''); setOtpMessage('');
    if (!phoneOk) { setError('Enter a valid 10-digit Indian mobile number first.'); return; }
    setOtpBusy(true);
    try {
      const r = await fetch('/api/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: f.phone, purpose: 'REGISTRATION' }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not send OTP.');
      setOtpSent(true); setVerificationToken(''); setOtp(''); setDemoOtp(d.demoOtp || ''); setResendIn(d.resendIn || 60);
      setOtpMessage('Verification code sent to your WhatsApp.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send OTP.'); }
    finally { setOtpBusy(false); }
  };

  const verifyOtp = async () => {
    setError(''); setOtpMessage('');
    if (otp.length !== 6) { setError('Enter the 6-digit verification code.'); return; }
    setOtpBusy(true);
    try {
      const r = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: f.phone, code: otp, purpose: 'REGISTRATION' }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Incorrect OTP.');
      setVerificationToken(d.verificationToken); setOtpMessage('Mobile verified. You can finish creating your account.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not verify OTP.'); }
    finally { setOtpBusy(false); }
  };

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    if (!phoneOk) { setError('Enter a valid 10-digit Indian mobile number.'); setBusy(false); return; }
    if (!verificationToken) { setError('Verify your mobile number before creating the account.'); setBusy(false); return; }
    if (f.password.length < 8) { setError('Use a password with at least 8 characters.'); setBusy(false); return; }
    try {
      const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, phoneVerificationToken: verificationToken }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not create account.');
      const login = await signIn('credentials', { email: f.email, phone: f.phone, password: f.password, redirect: false });
      if (login?.error) throw new Error('Account created, but automatic sign-in failed. Please sign in.');
      router.push('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create account.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="grain min-h-[calc(100svh-72px)] px-4 py-7 sm:px-6 md:grid md:place-items-center md:py-12">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#171310] shadow-editorial md:grid-cols-[.9fr_1fr] md:rounded-[2.7rem]">
        <aside className="relative hidden min-h-[650px] overflow-hidden p-10 md:flex md:flex-col md:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(78,110,88,.22),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(224,90,71,.16),transparent_32%)]" />
          <div className="relative">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-oat text-espresso"><Coffee /></span>
            <p className="eyebrow mt-9 text-matcha">The regulars club</p>
            <h1 className="display mt-4 max-w-xl text-7xl font-black leading-[.84] tracking-[-.06em]">Your coffee.<br /><span className="text-terracotta">Your shortcut.</span></h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-oat/55">One account keeps your favourites, orders and handover details close by — with a verified phone for smoother pickup.</p>
          </div>
          <div className="relative space-y-3 text-sm text-oat/55">
            <p><Check className="mr-2 inline text-matcha" size={16} /> Faster curbside handovers</p>
            <p><Check className="mr-2 inline text-matcha" size={16} /> Office orders without chaos</p>
            <p><Check className="mr-2 inline text-matcha" size={16} /> Verified WhatsApp updates</p>
          </div>
        </aside>

        <div className="bg-[#fff7f1] p-5 text-[#171310] sm:p-9 md:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-7 flex items-center justify-between gap-3 md:hidden">
              <Link href="/" className="display text-xl font-black">OAT<span className="text-terracotta">&</span>EMBER</Link>
              <span className="eyebrow text-terracotta">Join the regulars</span>
            </div>
            <p className="eyebrow text-terracotta">Create account</p>
            <h2 className="display mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl">Make it yours.</h2>
            <p className="mt-3 text-sm leading-6 text-[#171310]/65">Verify your mobile once, then your orders can stay connected to the right person at handover.</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <AuthField label="Full name" icon={<UserRound size={17} />}>
                <input required value={f.name} onChange={e => update('name', e.target.value)} placeholder="Your name" autoComplete="name" className="auth-field field auth-input-icon" />
              </AuthField>

              <AuthField label="Email address" icon={<Mail size={17} />}>
                <input required type="email" value={f.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" autoComplete="email" className="auth-field field auth-input-icon" />
              </AuthField>

              <AuthField label="Mobile number" hint={verificationToken ? 'Verified' : 'Verification required'} icon={<Phone size={17} />}>
                <input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={f.phone} onChange={e => { update('phone', e.target.value); setVerificationToken(''); setOtpSent(false); setOtpMessage(''); setOtp(''); }} placeholder="10-digit mobile number" autoComplete="tel" className="auth-field field auth-input-icon" />
              </AuthField>

              <div className="rounded-2xl border border-[#171310]/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-black"><MessageCircle size={16} className="text-matcha" /> Phone verification</div>
                  {verificationToken && <span className="text-[10px] font-black uppercase tracking-wider text-matcha">Verified ✓</span>}
                </div>
                {!verificationToken && !otpSent && <button type="button" onClick={requestOtp} disabled={!phoneOk || otpBusy} className="btn mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-matcha py-3 text-xs font-black text-white disabled:opacity-40">{otpBusy ? 'Generating code…' : 'Send verification code'} <ArrowRight size={14}/></button>}
                {!verificationToken && otpSent && demoOtp && <div className="mt-3 rounded-2xl border border-terracotta/25 bg-terracotta/10 p-4"><p className="text-[9px] font-black uppercase tracking-[.18em] text-terracotta">Demo verification code</p><p className="display mt-1 text-3xl font-black tracking-[.18em] text-[#171310]">{demoOtp}</p><p className="mt-1 text-[10px] text-[#171310]/45">Fresh code · expires in 5 minutes</p></div>}
                {!verificationToken && otpSent && <div className="mt-3 flex gap-2"><input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="auth-field field flex-1" /><button type="button" onClick={verifyOtp} disabled={otp.length !== 6 || otpBusy} className="rounded-xl bg-terracotta px-4 text-xs font-black text-white disabled:opacity-40">{otpBusy ? 'Checking…' : 'Verify'}</button></div>}
                {otpSent && !verificationToken && <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[#171310]/45"><span>{otpMessage || 'Code expires in 5 minutes.'}</span><button type="button" disabled={resendIn > 0 || otpBusy} onClick={requestOtp} className="font-black text-matcha disabled:opacity-40">{resendIn ? `Resend in ${resendIn}s` : 'Resend code'}</button></div>}
                {verificationToken && <p className="mt-2 text-xs text-[#171310]/50">This verification can be used once to finish this account creation.</p>}
              </div>

              <AuthField label="Password" hint="At least 8 characters" icon={<LockKeyhole size={17} />}>
                <input required minLength={8} maxLength={128} type="password" value={f.password} onChange={e => update('password', e.target.value)} placeholder="Create a password" autoComplete="new-password" className="auth-field field auth-input-icon" />
              </AuthField>

              <button disabled={busy || !phoneOk || !verificationToken} className="btn flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-terracotta py-4 font-black text-white shadow-[0_8px_0_rgba(23,19,16,.12)] disabled:cursor-not-allowed disabled:opacity-40">
                {busy ? 'Creating…' : 'Create account'}<ArrowRight size={17} />
              </button>
            </form>

            {googleAvailable && <div className="mt-5">
              <div className="mb-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.18em] text-[#171310]/30"><span className="h-px flex-1 bg-[#171310]/10" />or<span className="h-px flex-1 bg-[#171310]/10" /></div>
              <button type="button" onClick={() => signIn('google', { callbackUrl: '/' })} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#171310]/15 bg-white py-3.5 text-sm font-black text-[#171310] transition hover:border-[#171310]/30 hover:shadow-sm"><span className="grid h-6 w-6 place-items-center rounded-full border border-[#171310]/15 text-sm font-black">G</span> Sign up with Google</button>
            </div>}

            {error && <p role="alert" className="mt-4 rounded-2xl border border-terracotta/25 bg-terracotta/10 p-3 text-center text-sm font-bold text-terracotta">{error}</p>}
            {otpMessage && !error && !verificationToken && <p className="mt-4 rounded-2xl border border-matcha/20 bg-matcha/10 p-3 text-center text-sm font-bold text-matcha">{otpMessage}</p>}

            <div className="mt-5 rounded-2xl border border-[#171310]/10 bg-white p-4 text-xs font-medium leading-5 text-[#171310]/65">
              <div className="flex gap-2"><ShieldCheck size={16} className="shrink-0 text-matcha" /><span>Passwords are one-way hashed. Customer contact data is encrypted at rest and never stored as plaintext for lookup.</span></div>
            </div>
            <p className="mt-5 text-center text-sm text-[#171310]/50">Already have an account? <Link className="font-black text-matcha hover:underline" href="/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
}

function AuthField({ label, hint, icon, children }: { label: string; hint?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[.12em] text-[#171310]/80">{label}</span>
        {hint && <span className={`text-[10px] font-semibold ${hint === 'Verified' ? 'text-matcha' : 'text-[#171310]/40'}`}>{hint}</span>}
      </span>
      <div className="relative">
        <span className="auth-icon-box" aria-hidden="true">{icon}</span>
        {children}
      </div>
    </label>
  );
}
