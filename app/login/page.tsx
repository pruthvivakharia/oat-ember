"use client";
import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Coffee,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Check,
} from "lucide-react";

export default function Login() {
  const [f, setF] = useState({ email: "", phone: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const router = useRouter();
  const phoneOk = /^[6-9]\d{9}$/.test(f.phone);
  useEffect(() => {
    fetch('/api/auth/providers').then(r => r.ok ? r.json() : null).then(d => setGoogleAvailable(Boolean(d?.google))).catch(() => {});
    try {
      const saved = JSON.parse(
        localStorage.getItem("oat-ember-login") || "null",
      );
      if (saved) {
        setF((x: { email: string; phone: string; password: string }) => ({
          ...x,
          email: saved.email || "",
          phone: saved.phone || "",
          password: "",
        }));
        setRemember(true);
      }
    } catch {}
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (!phoneOk) {
      setError("Enter a valid 10-digit Indian mobile number.");
      setBusy(false);
      return;
    }
    const r = await signIn("credentials", {
      email: f.email,
      phone: f.phone,
      password: f.password,
      redirect: false,
    });
    if (r?.error) {
      setError("Email, mobile number or password is incorrect.");
      setBusy(false);
      return;
    }
    if (remember)
      localStorage.setItem(
        "oat-ember-login",
        JSON.stringify({ email: f.email, phone: f.phone }),
      );
    else localStorage.removeItem("oat-ember-login");
    router.push("/");
    setBusy(false);
  }
  return (
    <main className="grain min-h-[calc(100svh-72px)] px-4 py-7 sm:px-6 md:grid md:place-items-center md:py-12">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#171310] shadow-editorial md:grid-cols-[1fr_.9fr] md:rounded-[2.7rem]">
        <div className="relative hidden min-h-[650px] overflow-hidden p-10 md:flex md:flex-col md:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(224,90,71,.2),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(78,110,88,.18),transparent_30%)]" />
          <div className="relative">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-oat text-espresso">
              <Coffee />
            </span>
            <p className="eyebrow mt-9 text-matcha">The regulars club</p>
            <h1 className="display mt-4 max-w-xl text-7xl font-black leading-[.84] tracking-[-.06em]">
              Your coffee
              <br />
              knows your
              <br />
              <span className="text-terracotta">name.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-oat/55">
              Keep your phone on file so the café can actually call you when
              your order is ready.
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-2">
            <Stat icon={<Phone />} text="Call-ready" />
            <Stat icon={<LockKeyhole />} text="Secure login" />
            <Stat icon={<Sparkles />} text="Faster repeat" />
          </div>
        </div>
        <div className="bg-[#F8EEE7] p-5 text-[#171310] sm:p-9 md:p-10">
          <div className="md:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="display text-xl font-black">
                OAT<span className="text-terracotta">&</span>EMBER
              </Link>
              <span className="eyebrow text-terracotta">Member access</span>
            </div>
            <div className="mt-7 rounded-3xl bg-espresso p-5 text-oat">
              <p className="eyebrow text-matcha">Welcome back</p>
              <h1 className="display mt-2 text-4xl font-black leading-[.9]">
                Your next cup
                <br />
                starts here.
              </h1>
            </div>
          </div>
          <div className="mx-auto max-w-md">
            <p className="eyebrow mt-7 text-terracotta md:mt-0">Sign in</p>
            <h2 className="display mt-2 text-4xl font-black tracking-[-.04em] text-[#171310]">
              Come on in.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#171310]/70">
              Email + mobile + password. Three details, zero guessing at
              handover.
            </p>
            <form onSubmit={submit} className="mt-7 space-y-4">
              <FieldLabel label="Email address">
                <div className="relative">
                  <span className="auth-icon-box" aria-hidden="true">
                    <Mail size={16} />
                  </span>
                  <input
                    required
                    type="email"
                    value={f.email}
                    onChange={(e) => setF({ ...f, email: e.target.value })}
                    placeholder="you@example.com"
                    className="auth-field field auth-input-icon border-[#171310]/20 bg-white text-[#171310] placeholder:text-[#171310]/40 focus:border-terracotta"
                  />
                </div>
              </FieldLabel>
              <FieldLabel label="Mobile number">
                <div className="relative">
                  <span className="auth-icon-box">
                    <Phone size={16} />
                  </span>
                  <input
                    required
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    value={f.phone}
                    onChange={(e) =>
                      setF({
                        ...f,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    placeholder="10-digit mobile number"
                    className="auth-field field auth-input-icon border-[#171310]/20 bg-white text-[#171310] placeholder:text-[#171310]/40 focus:border-terracotta"
                  />
                </div>
              </FieldLabel>
              <FieldLabel label="Password">
                <div className="relative">
                  <span className="auth-icon-box" aria-hidden="true">
                    <LockKeyhole size={16} />
                  </span>
                  <input
                    required
                    type="password"
                    value={f.password}
                    onChange={(e) => setF({ ...f, password: e.target.value })}
                    placeholder="Enter your password"
                    className="auth-field field auth-input-icon border-[#171310]/20 bg-white text-[#171310] placeholder:text-[#171310]/40 focus:border-terracotta"
                  />
                </div>
              </FieldLabel>
              <label className="flex cursor-pointer items-center gap-2 py-1 text-xs font-bold text-[#171310]/70">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-[#E05A47]"
                />
                <Check size={13} className="text-matcha" />
                Remember me on this device
              </label>
              <button
                disabled={busy || !phoneOk}
                className="btn flex w-full items-center justify-center gap-2 rounded-2xl bg-terracotta py-4 font-black text-white shadow-[0_8px_0_rgba(23,19,16,.12)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy ? "Signing in…" : "Sign in"}
                <ArrowRight size={17} />
              </button>
            </form>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-terracotta/25 bg-terracotta/10 p-3 text-center text-sm font-bold text-terracotta"
              >
                {error}
              </p>
            )}
            {googleAvailable && (
              <>
                <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.18em] text-[#171310]/30"><span className="h-px flex-1 bg-[#171310]/10" />or<span className="h-px flex-1 bg-[#171310]/10" /></div>
                <button type="button" onClick={() => signIn('google', { callbackUrl: '/' })} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#171310]/15 bg-white py-3.5 text-sm font-black text-[#171310] transition hover:border-[#171310]/30 hover:shadow-sm">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-[#171310]/15 text-sm font-black">G</span> Continue with Google
                </button>
              </>
            )}

            <div className="mt-5 rounded-2xl border border-[#171310]/12 bg-white p-4 text-xs font-medium leading-5 text-[#171310]/70">
              <div className="flex gap-2">
                <ShieldCheck size={16} className="shrink-0 text-matcha" />
                <span>
                  Phone verification is required because the café uses it for
                  order-ready calls.
                </span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-xs">
              <Link href="/forgot-password" className="font-black text-matcha hover:underline">Forgot password?</Link>
              <span className="text-[#171310]/40">Your password is never stored in plaintext.</span>
            </div>
            <Link
              href="/register"
              className="mt-5 block text-center text-sm font-black text-matcha hover:underline"
            >
              Create a customer account
            </Link>
            <Link
              href="/"
              className="mt-3 block text-center text-sm font-semibold text-[#171310]/50 hover:text-[#171310]"
            >
              ← Back to café
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[.12em] text-[#171310]/80">
        {label}
      </span>
      {children}
    </label>
  );
}
function Stat({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
      <div className="text-matcha">{icon}</div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-oat/55">
        {text}
      </p>
    </div>
  );
}
