"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  PackageCheck,
  CheckCircle2,
  Coffee,
  LogIn,
  Truck,
  Building2,
  RotateCcw,
  ReceiptText,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCart } from "@/store/cart";
import { Product, CartItem } from "@/types";
const icon = (s: string) =>
  s === "RECEIVED"
    ? Clock3
    : s === "BREWING"
      ? Coffee
      : s === "PACKED"
        ? PackageCheck
        : CheckCircle2;

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingAgain, setLoadingAgain] = useState<string | null>(null);
  const setItems = useCart((s) => s.setItems);
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/orders/mine", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setOrders(d.orders || []));
      fetch("/api/products", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setProducts(d.products || []));
    }
  }, [status]);
  const orderAgain = async (o: any) => {
    setLoadingAgain(o.id);

    let catalog = products;

    if (!catalog.length) {
      try {
        const r = await fetch("/api/products", { cache: "no-store" });
        const d = await r.json();
        catalog = d.products || [];
        setProducts(catalog);
      } catch {
        setLoadingAgain(null);
        return;
      }
    }

    const byId = new Map(catalog.map((p) => [p.id, p]));
    const items: CartItem[] = [];

    for (const i of o.items || []) {
      const p = byId.get(i.productId);

      if (!p || !p.available) continue;

      let c: any = {
        sweetness: 50,
        shots: 0,
      };

      try {
        c = i.customizations ? JSON.parse(i.customizations) : c;
      } catch {}
      const existing = items.find(
        (x) =>
          x.id === p.id &&
          JSON.stringify(x.customizations) === JSON.stringify(c),
      );

      if (existing) {
        existing.quantity = Math.min(10, existing.quantity + i.quantity);
      } else {
        items.push({
          ...p,
          quantity: Math.min(10, i.quantity),
          customizations: c,
        });
      }
    }

    if (items.length) {
      setItems(items);
    }

    setLoadingAgain(null);
  };
  return (
    <main className="grain min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-black text-oat/40"
        >
          <ArrowLeft size={14} /> Home
        </Link>
        <div className="mt-8">
          <p className="eyebrow text-matcha">Your coffee trail</p>
          <h1 className="display mt-3 text-6xl font-black leading-[.85]">
            Order
            <br />
            <span className="text-terracotta">history.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-oat/45">
            Reorder your favourites in one tap, or jump straight back into the
            live tracker.
          </p>
        </div>
        {status === "loading" ? (
          <p className="mt-10 text-sm text-oat/40">Loading orders…</p>
        ) : !session ? (
          <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[.035] p-8 text-center">
            <LogIn className="mx-auto text-matcha" />
            <h2 className="display mt-4 text-3xl font-black">
              Sign in to see your orders.
            </h2>
            <Link
              href="/login"
              className="btn mt-6 inline-flex items-center gap-2 rounded-2xl bg-terracotta px-5 py-3.5 text-sm font-black"
            >
              Sign in <ArrowRight size={15} />
            </Link>
          </div>
        ) : orders.length ? (
          <div className="mt-10 space-y-4">
            {orders.map((o) => {
              const Icon = icon(o.status);
              let fd: any = {};
              try {
                fd = JSON.parse(o.fulfillmentData);
              } catch {}
              return (
                <article
                  key={o.id}
                  className="rounded-[1.7rem] border border-white/10 bg-white/[.035] p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-oat/30">
                        #{o.id.slice(-6).toUpperCase()}
                      </p>
                      <h2 className="display mt-1 text-2xl font-black">
                        ₹{o.total}
                      </h2>
                    </div>
                    <span className="flex items-center gap-2 rounded-full bg-matcha/10 px-3 py-2 text-[10px] font-black text-matcha">
                      <Icon size={13} />
                      {o.status === "COMPLETED" ? "READY" : o.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-oat/40 sm:grid-cols-3">
                    <span>
                      {new Date(o.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {o.fulfillmentType === "VEHICLE" ? (
                        <Truck size={13} />
                      ) : (
                        <Building2 size={13} />
                      )}{" "}
                      {o.fulfillmentType === "VEHICLE" ? "Curbside" : "Office"}
                    </span>
                    <span>
                      {o.items.reduce((n: number, i: any) => n + i.quantity, 0)}{" "}
                      item(s) · {fd.licensePlate || fd.companyName || ""}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => orderAgain(o)}
                      disabled={loadingAgain === o.id}
                      className="btn flex flex-1 items-center justify-center gap-2 rounded-2xl bg-terracotta py-3.5 text-sm font-black disabled:opacity-40"
                    >
                      {loadingAgain === o.id ? (
                        "Loading…"
                      ) : (
                        <>
                          <RotateCcw size={15} /> Order again
                        </>
                      )}
                    </button>
                    <Link
                      href={`/track/${o.trackingToken}`}
                      className="btn flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] py-3.5 text-sm font-black"
                    >
                      <Truck size={15} /> Track order
                    </Link>
                    <Link
                      href={`/receipt/${o.trackingToken}`}
                      className="btn flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-sm font-black"
                    >
                      <ReceiptText size={15} /> Receipt
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-dashed border-white/10 p-10 text-center">
            <h2 className="display text-3xl font-black">No orders yet.</h2>
            <Link
              href="/menu"
              className="btn mt-6 inline-flex rounded-2xl bg-oat px-5 py-3.5 text-sm font-black text-espresso"
            >
              Order your first cup
            </Link>
          </div>
        )}
        <Link
          href="/track"
          className="mt-7 inline-flex items-center gap-2 text-xs font-black text-terracotta"
        >
          Open guest tracking <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  );
}
