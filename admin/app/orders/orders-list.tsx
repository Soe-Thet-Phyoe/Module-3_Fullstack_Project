"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Item = { product_id: string; title: string; price: string; quantity: number; line_total: string };
type Order = { id: string; customer: string; created_at: string; total: string; items: Item[] };
type OrderPage = { orders: Order[]; page: number; pages: number };
type Result = { kind: "ready"; data: OrderPage } | { kind: "signin" | "denied" } | { kind: "loading" | "error" };

const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
function money(value: string) {
  return "MMK " + amount.format(Number(value));
}

function Receipt({ order }: { order: Order }) {
  return (
    <details className="border-b border-slate-200 last:border-0">
      <summary className="cursor-pointer rounded-sm px-1 py-4 marker:text-slate-500">
        <span className="font-medium wrap-anywhere">Order {order.id}</span>
        <span className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 pl-4 text-sm">
          <span className="wrap-anywhere">{order.customer}</span>
          <time className="text-slate-600" dateTime={order.created_at}>{new Date(order.created_at).toLocaleString()}</time>
          <strong className="sm:ml-auto">{money(order.total)}</strong>
        </span>
      </summary>
      <ul aria-label="Ordered items" className="mb-4 divide-y rounded-lg bg-slate-50 px-4">
        {order.items.map(item => (
          <li key={item.product_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div><p className="font-medium wrap-anywhere">{item.title}</p>
              <p className="text-sm text-slate-600">{item.quantity} × {money(item.price)}</p></div>
            <span>{money(item.line_total)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function OrderResults({ page, changePage }: {
  page: number; changePage: (page: number) => void;
}) {
  const [result, setResult] = useState<Result>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/orders?page=" + page, { cache: "no-store", signal: controller.signal });
        let next: Result;
        if (response.status === 401 || response.status === 403) {
          next = { kind: response.status === 401 ? "signin" : "denied" };
        } else if (!response.ok) next = { kind: "error" };
        else next = { kind: "ready", data: await response.json() };
        if (!controller.signal.aborted) setResult(next);
      } catch {
        if (!controller.signal.aborted) setResult({ kind: "error" });
      }
    }
    void load();
    return () => controller.abort();
  }, [page, attempt]);

  function retry() {
    setResult({ kind: "loading" });
    setAttempt(value => value + 1);
  }

  if (result.kind === "loading") return <p role="status">Loading orders…</p>;
  if (result.kind === "signin" || result.kind === "denied") {
    return <div className="space-y-3">
      <p role="alert">{result.kind === "denied" ? "Admin access is required to view orders." : "Sign in with the dashboard account to view orders."}</p>
      <p><Link className="font-medium underline" href="/login?next=/orders">Admin sign-in</Link></p>
      <Button variant="outline" onClick={retry}>Check access</Button>
    </div>;
  }
  if (result.kind !== "ready") return <div className="space-y-3">
    <p role="alert">Customer orders could not be loaded.</p>
    <Button variant="outline" onClick={retry}>Retry</Button>
  </div>;
  const { orders, page: current, pages } = result.data;
  if (!orders.length) return <p>No customer orders yet.</p>;
  return <>
    {orders.map(order => <Receipt key={order.id} order={order} />)}
    {pages > 1 && <nav aria-label="Order pages" className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" disabled={current <= 1} onClick={() => changePage(current - 1)}>Previous</Button>
      <span>Page {current} of {pages}</span>
      <Button variant="outline" disabled={current >= pages} onClick={() => changePage(current + 1)}>Next</Button>
    </nav>}
  </>;
}

export default function OrdersList() {
  const [page, setPage] = useState(1);
  return <Card><CardContent>
    <OrderResults key={page} page={page} changePage={setPage} />
  </CardContent></Card>;
}
