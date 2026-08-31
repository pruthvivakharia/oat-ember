"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  X,
  MessageCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCart } from "@/store/cart";
import TakeawaySelectorModal from "./TakeawaySelectorModal";
import { FulfillmentData } from "@/types";

export default function CartDrawer() {
  const { items, open, setOpen, remove, total, clear } = useCart();
  const { data: session } = useSession();
  const [fulfill, setFulfill] = useState<FulfillmentData | null>(null);
  const [pick, setPick] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "CASH">(
    "RAZORPAY",
  );
  const [details, setDetails] = useState({ name: "", email: "", phone: "" });
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [trackingToken, setTrackingToken] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const [otpVerificationToken, setOtpVerificationToken] = useState("");

  useEffect(() => {
    setDetails({
      name: session?.user?.name || "",
      email: session?.user?.email || "",
      phone: (session?.user as { phone?: string } | undefined)?.phone || "",
    });
  }, [session]);

  useEffect(() => {
    setOtp("");
    setOtpSent(false);
    setDemoOtp("");
    setOtpVerificationToken("");
  }, [paymentMethod, details.phone]);

  useEffect(() => {
    fetch("/api/payment/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setOnlineEnabled(Boolean(d.enabled));
        if (!d.enabled) setPaymentMethod("CASH");
      })
      .catch(() => setOnlineEnabled(false));
  }, []);

  if (!open) return null;

  const phone = details.phone.replace(/\D/g, "");
  const accountPhone = (session?.user as { phone?: string } | undefined)?.phone;
  const accountPhoneVerified = Boolean(
    (session?.user as any)?.phoneVerified && accountPhone === phone,
  );
  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const formOk = items.length > 0 && details.name.trim().length > 0 && phoneOk;

  const requestCashOtp = async () => {
    setMessage("");
    if (!phoneOk)
      return setMessage("Enter a valid 10-digit Indian mobile number.");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "CASH_ORDER" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not send OTP.");
      setOtpSent(true);
      setOtpVerificationToken("");
      setDemoOtp(d.demoOtp || "");
      setMessage(
        d.demoMode ? "Demo OTP generated below." : "OTP sent to your WhatsApp.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCashOtp = async () => {
    setMessage("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, purpose: "CASH_ORDER" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Incorrect OTP.");
      setOtpVerificationToken(d.verificationToken);
      setMessage("Phone verified. You can place the cash order now.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Incorrect OTP.");
    } finally {
      setLoading(false);
    }
  };

  const pay = async () => {
    setMessage("");
    if (!fulfill) return setPick(true);
    if (!details.name.trim())
      return setMessage("Add your full name to continue.");
    if (!phoneOk)
      return setMessage("Enter a valid 10-digit Indian mobile number.");
    if (
      paymentMethod === "CASH" &&
      !otpVerificationToken &&
      !accountPhoneVerified
    ) {
      return setMessage(
        "Verify your mobile with OTP before placing a cash order.",
      );
    }

    setLoading(true);
    try {
      if (paymentMethod === "CASH") {
        const r = await fetch("/api/orders/cash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            fulfillment: fulfill,
            customerName: details.name.trim(),
            customerEmail: details.email.trim(),
            customerPhone: phone,
            otpVerificationToken,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Unable to place cash order.");
        clear();
        setTrackingToken(d.trackingToken || "");
        if (d.trackingToken)
          localStorage.setItem("oat-ember-last-order", d.trackingToken);
        setSuccess(true);
        setMessage(`Order confirmed · #${d.orderId.slice(-6).toUpperCase()}`);
        return;
      }

      const r = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          fulfillment: fulfill,
          customerName: details.name.trim(),
          customerEmail: details.email.trim(),
          customerPhone: phone,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to start payment.");
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay)
        throw new Error(
          "Secure checkout is still loading. Try again in a moment.",
        );

      const checkout = new Razorpay({
        key: d.keyId,
        amount: d.amount,
        currency: "INR",
        name: "Oat & Ember",
        description: "Coffee takeaway",
        order_id: d.orderId,
        prefill: { name: details.name, email: details.email, contact: phone },
        theme: { color: "#E05A47" },
        handler: async (result: any) => {
          try {
            const vr = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...result,
                items,
                fulfillment: fulfill,
                customerName: details.name.trim(),
                customerEmail: details.email.trim(),
                customerPhone: phone,
              }),
            });
            const out = await vr.json();
            if (!vr.ok)
              throw new Error(out.error || "Payment verification failed.");
            clear();
            setTrackingToken(out.trackingToken || "");
            if (out.trackingToken)
              localStorage.setItem("oat-ember-last-order", out.trackingToken);
            setSuccess(true);
            setMessage(
              `Order confirmed · #${out.orderId.slice(-6).toUpperCase()}`,
            );
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : "Payment verification failed.",
            );
          } finally {
            setLoading(false);
          }
        },
      });
      checkout.open();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <div
        className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md"
        onClick={() => setOpen(false)}
      >
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-[#151210] shadow-2xl"
        >
          <div className="shrink-0 border-b border-white/10 bg-[#151210]/95 p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow text-matcha">Your bag</span>
                <h2 className="display mt-2 text-3xl font-black leading-none sm:text-4xl">
                  Almost out the door.
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-3"
                aria-label="Close bag"
              >
                <X size={18} />
              </button>
            </div>
            {!success && items.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-1.5">
                <Step active={items.length > 0} n="01" t="Bag" />
                <Step active={!!fulfill} n="02" t="Handover" />
                <Step active={formOk} n="03" t="Checkout" />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {success ? (
              <div className="mx-auto mt-8 max-w-md rounded-[2rem] border border-matcha/20 bg-matcha/10 p-7 text-center sm:mt-16">
                <CheckCircle2 className="mx-auto text-matcha" size={52} />
                <span className="eyebrow mt-5 text-matcha">Locked in</span>
                <h3 className="display mt-2 text-4xl font-black">
                  See you soon.
                </h3>
                <p className="mt-3 text-sm leading-6 text-oat/55">{message}</p>
                <p className="mt-5 text-xs leading-5 text-oat/35">
                  Keep your phone nearby. We'll call if the café needs you for
                  the handover.
                </p>
                {trackingToken && (
                  <a
                    href={`/track/${trackingToken}`}
                    onClick={() => setOpen(false)}
                    className="btn mt-6 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-black"
                  >
                    Track my order live
                  </a>
                )}
                <button
                  onClick={() => {
                    setSuccess(false);
                    setTrackingToken("");
                    setMessage("");
                    setOpen(false);
                  }}
                  className="btn mt-3 w-full rounded-2xl bg-oat py-3.5 text-sm font-black text-espresso"
                >
                  Back to menu
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="grid min-h-[50vh] place-items-center text-center text-oat/35">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/10">
                    <CreditCard />
                  </div>
                  <p className="mt-4 text-sm">
                    Your bag is waiting for a good idea.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <motion.div
                      layout
                      key={`${item.id}-${JSON.stringify(item.customizations)}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[.025] p-4"
                    >
                      <div className="flex justify-between gap-4">
                        <div>
                          <b>{item.name}</b>
                          <p className="mt-1 text-[11px] text-oat/35">
                            {item.customizations?.sweetness ?? 50}% sweet ·{" "}
                            {item.customizations?.shots ?? 0} extra shot(s)
                            {item.customizations?.milk
                              ? ` · ${item.customizations.milk}`
                              : ""}
                          </p>
                        </div>

                        <b className="text-terracotta">
                          ₹
                          {(item.price +
                            (item.customizations?.shots ?? 0) * 50) *
                            item.quantity}
                        </b>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => remove(item.id)}
                          className="rounded-full bg-white/10 p-2"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>

                        <span className="text-sm font-bold">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => {
                            if (item.quantity < 10) {
                              useCart
                                .getState()
                                .add(item as any, item.customizations);
                            }
                          }}
                          className="rounded-full bg-white/10 p-2"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>

                        <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-oat/25">
                          max 10
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 rounded-[1.7rem] border border-white/10 bg-white/[.025] p-4">
                  <p className="eyebrow text-oat/30">
                    Contact for the handover
                  </p>
                  <div className="mt-3 grid gap-2">
                    <input
                      value={details.name}
                      onChange={(e) =>
                        setDetails({ ...details, name: e.target.value })
                      }
                      placeholder="Full name"
                      autoComplete="name"
                      className="field"
                    />
                    <input
                      value={details.email}
                      onChange={(e) =>
                        setDetails({ ...details, email: e.target.value })
                      }
                      placeholder="Email (optional)"
                      autoComplete="email"
                      type="email"
                      className="field"
                    />
                    <input
                      value={details.phone}
                      onChange={(e) =>
                        setDetails({
                          ...details,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                        })
                      }
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      placeholder="10-digit mobile · required"
                      className={`field ${details.phone && !phoneOk ? "border-terracotta/60" : ""}`}
                    />
                    <p className="text-[10px] text-oat/25">
                      Your mobile is used for ready calls and order updates when
                      WhatsApp is enabled.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPick(true)}
                  className="mt-3 flex w-full items-center justify-between rounded-[1.7rem] border border-white/10 bg-white/[.025] p-4 text-left transition hover:border-matcha/30"
                >
                  <div>
                    <span className="eyebrow text-oat/30">Handover</span>
                    <p className="mt-1 font-bold">
                      {fulfill
                        ? fulfill.type === "VEHICLE"
                          ? "Vehicle curbside"
                          : "Corporate / office"
                        : "Choose where to send it"}
                    </p>
                  </div>
                  <Truck className="text-matcha" size={19} />
                </button>

                <div className="mt-3 rounded-[1.7rem] border border-white/10 bg-white/[.025] p-4">
                  <span className="eyebrow text-oat/30">
                    How are you paying?
                  </span>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <PayChoice
                      active={paymentMethod === "RAZORPAY"}
                      icon={<CreditCard size={17} />}
                      title="Online"
                      sub={onlineEnabled ? "Razorpay" : "Setup pending"}
                      onClick={() =>
                        onlineEnabled && setPaymentMethod("RAZORPAY")
                      }
                    />
                    <PayChoice
                      active={paymentMethod === "CASH"}
                      icon={<Banknote size={17} />}
                      title="Cash"
                      sub="At handover"
                      onClick={() => setPaymentMethod("CASH")}
                    />
                  </div>
                  <div className="mt-3 flex gap-2 rounded-2xl bg-matcha/10 p-3 text-xs text-oat/50">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-matcha text-espresso text-[9px] font-black">
                      ✓
                    </span>
                    <span>
                      Order updates can be sent to{" "}
                      <b className="text-oat">WhatsApp</b> on +91{" "}
                      {phone || "your mobile"} once the café connects its
                      sender.
                    </span>
                  </div>
                  {paymentMethod === "CASH" && (
                    <div className="mt-3 rounded-2xl border border-terracotta/20 bg-terracotta/5 p-3">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <MessageCircle size={15} className="text-matcha" />{" "}
                        {accountPhoneVerified
                          ? "Verified account — no extra OTP needed"
                          : "Cash orders require phone OTP"}
                      </div>
                      {!accountPhoneVerified && !otpVerificationToken ? (
                        <>
                          {!otpSent ? (
                            <button
                              onClick={requestCashOtp}
                              disabled={!phoneOk || loading}
                              className="mt-3 w-full rounded-xl bg-matcha py-3 text-xs font-black text-white disabled:opacity-40"
                            >
                              {loading ? "Sending…" : "Send verification code"}
                            </button>
                          ) : (
                            <>
                              <>
                                {demoOtp && (
                                  <div className="mt-3 rounded-2xl border border-terracotta/25 bg-terracotta/10 p-3">
                                    <p className="text-[9px] font-black uppercase tracking-[.18em] text-terracotta">
                                      Demo OTP
                                    </p>
                                    <p className="display mt-1 text-2xl font-black tracking-[.18em]">
                                      {demoOtp}
                                    </p>
                                  </div>
                                )}
                              </>
                              <div className="mt-3 flex gap-2">
                                <input
                                  value={otp}
                                  onChange={(e) =>
                                    setOtp(
                                      e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 6),
                                    )
                                  }
                                  inputMode="numeric"
                                  maxLength={6}
                                  placeholder="6-digit OTP"
                                  className="field flex-1"
                                />
                                <button
                                  onClick={verifyCashOtp}
                                  disabled={otp.length !== 6 || loading}
                                  className="rounded-xl bg-terracotta px-4 text-xs font-black text-white disabled:opacity-40"
                                >
                                  {loading ? "Checking…" : "Verify"}
                                </button>
                              </div>
                            </>
                          )}{" "}
                        </>
                      ) : (
                        <p className="mt-3 text-xs font-bold text-matcha">
                          ✓ Mobile verified for this cash order.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#151210]/96 p-4 safe-bottom backdrop-blur-xl sm:p-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs text-oat/35">Total</span>
                <p className="display text-3xl font-black">₹{total()}</p>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-oat/35">
                {paymentMethod === "CASH" ? "Cash due" : "Secure online"}
              </span>
            </div>
            {message && !success && (
              <p className="mt-3 rounded-xl bg-terracotta/10 p-3 text-center text-xs text-terracotta">
                {message}
              </p>
            )}
            <button
              disabled={!formOk || !fulfill || loading || success}
              onClick={pay}
              className="btn mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-terracotta py-4 font-black disabled:opacity-30"
            >
              {loading
                ? "Securing your order…"
                : paymentMethod === "CASH"
                  ? "Place cash order"
                  : "Pay securely"}
              <ShieldCheck size={16} />
            </button>
          </div>
        </motion.aside>
      </div>
      <AnimatePresence>
        {pick && (
          <TakeawaySelectorModal
            onClose={() => setPick(false)}
            onSelect={(d) => {
              setFulfill(d);
              setPick(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Step({ active, n, t }: { active: boolean; n: string; t: string }) {
  return (
    <div
      className={`rounded-xl px-2 py-2 ${active ? "bg-white/[.06]" : "bg-white/[.02]"}`}
    >
      <p
        className={`text-[8px] font-black tracking-widest ${active ? "text-matcha" : "text-oat/20"}`}
      >
        {n}
      </p>
      <p className="mt-1 text-[10px] font-bold text-oat/40">{t}</p>
    </div>
  );
}
function PayChoice({
  active,
  icon,
  title,
  sub,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition ${active ? "border-terracotta bg-terracotta/10" : "border-white/10 bg-black/10 hover:border-white/20"}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold">{title}</span>
      </div>
      <p className="mt-1 text-[10px] text-oat/30">{sub}</p>
    </button>
  );
}
