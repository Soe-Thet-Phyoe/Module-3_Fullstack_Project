"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useOptionalStorefrontAuth } from "@/components/storefront-auth";
import { StorefrontShell } from "@/components/storefront-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getOrderHistory, OrderApiError, type Order, type OrderHistory } from "@/lib/orders-api";
import { formatShopPrice } from "@/lib/shop-api";

const loginPath = "/login?next=%2Forders";

function Receipt({ order }: { order: Order }) {
  return <article>
    <Card><CardContent>
      <h2 className="wrap-anywhere font-semibold">Order {order.id}</h2>
      <time className="text-sm text-slate-600" dateTime={order.created_at}>
        {new Date(order.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
      </time>
      <ul className="mt-4 divide-y border-y" aria-label="Ordered items">
        {order.items.map(item => <li key={item.product_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="min-w-0">
            <p className="wrap-anywhere font-medium">{item.title}</p>
            <p className="text-sm text-slate-600">{item.quantity} × {formatShopPrice(item.price)}</p>
          </div>
          <span>{formatShopPrice(item.line_total)}</span>
        </li>)}
      </ul>
      <div className="cart-total"><span>Order total</span><strong>{formatShopPrice(order.total)}</strong></div>
    </CardContent></Card>
  </article>;
}

function CustomerHistory() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<OrderHistory | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getOrderHistory(page).then(result => {
      if (active) setHistory(result);
    }).catch(cause => {
      if (!active) return;
      if (cause instanceof OrderApiError && cause.status === 401) router.replace(loginPath);
      else setFailed(true);
    });
    return () => { active = false; };
  }, [attempt, page, router]);

  function changePage(number: number) {
    setHistory(null);
    setPage(number);
  }

  if (failed) return <div className="cart-feedback">
    <p role="alert">Your order history could not be loaded.</p>
    <Button variant="outline" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Retry</Button>
  </div>;
  if (!history) return <p role="status">Loading your orders…</p>;
  if (!history.orders.length) return <div className="shop-state">
    <h2>No orders yet</h2><Link className="shop-back-link" href="/shop">Continue shopping</Link>
  </div>;
  return <div className="grid gap-5">
    {history.orders.map(order => <Receipt key={order.id} order={order} />)}
    {history.pages > 1 && <nav className="flex flex-wrap items-center justify-between gap-2" aria-label="Order history pages">
      <Button variant="outline" disabled={history.page <= 1} onClick={() => changePage(history.page - 1)}>Previous</Button>
      <span>Page {history.page} of {history.pages}</span>
      <Button variant="outline" disabled={history.page >= history.pages} onClick={() => changePage(history.page + 1)}>Next</Button>
    </nav>}
  </div>;
}

export default function OrdersPage() {
  const { customer, loading } = useOptionalStorefrontAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !customer) router.replace(loginPath);
  }, [customer, loading, router]);

  return <StorefrontShell><main className="cart-page section-wrap">
    <h1>Order history</h1>
    {customer ? <CustomerHistory key={customer.email} /> : <p role="status">{loading ? "Loading your orders…" : "Opening login…"}</p>}
  </main></StorefrontShell>;
}
