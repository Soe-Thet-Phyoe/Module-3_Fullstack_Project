"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Boxes, ReceiptText, Tag } from "lucide-react";

import AdminShell from "@/components/admin-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const resources = ["categories", "products", "orders"] as const;
type Resource = typeof resources[number];
type Entry = { id: string; label: string; date: string; customer?: string; amount?: string };
type Summary =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; total: number; entries: Entry[] };

const icons = { categories: Tag, products: Boxes, orders: ReceiptText };
const dateFormat = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });
const amountFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readEntry(resource: Resource, row: unknown): Entry {
  if (!isRecord(row) || typeof row.id !== "string" || typeof row.created_at !== "string"
      || !Number.isFinite(Date.parse(row.created_at))) throw new Error("Invalid entry");

  const base = { id: row.id, date: row.created_at };
  if (resource === "orders") {
    if (typeof row.customer !== "string" || typeof row.total !== "string"
        || !row.total.trim() || !Number.isFinite(Number(row.total))) throw new Error("Invalid receipt");
    return { ...base, label: "Order " + row.id, customer: row.customer, amount: "MMK " + amountFormat.format(Number(row.total)) };
  }
  const label = resource === "categories" ? row.name : row.title;
  if (typeof label !== "string") throw new Error("Invalid catalog entry");
  return { ...base, label };
}

function useSummary(resource: Resource) {
  const [summary, setSummary] = useState<Summary>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/" + resource, { signal: controller.signal, cache: "no-store" });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = isRecord(payload) && typeof payload.error === "string" && payload.error;
          if (!controller.signal.aborted) setSummary({ status: "error", message: message || `Recent ${resource} are unavailable.` });
          return;
        }
        if (!isRecord(payload)) throw new Error("Invalid response");
        const rows = payload[resource];
        if (!Array.isArray(rows)) throw new Error("Invalid collection");
        const total = resource === "orders" ? payload.total_count : rows.length;
        if (typeof total !== "number" || !Number.isSafeInteger(total) || total < rows.length) throw new Error("Invalid count");
        const entries = rows.slice(0, 5).map(row => readEntry(resource, row));
        if (!controller.signal.aborted) setSummary({ status: "ready", total, entries });
      } catch {
        if (!controller.signal.aborted) setSummary({ status: "error", message: `Recent ${resource} are unavailable.` });
      }
    }
    void load();
    return () => controller.abort();
  }, [resource]);
  return summary;
}

function RecentEntries({ resource, summary }: { resource: Resource; summary: Summary }) {
  if (summary.status === "loading") return <p role="status">Loading {resource}…</p>;
  if (summary.status === "error") return <p role="alert" className="text-rose-700">{summary.message}</p>;
  if (!summary.entries.length) return <p>No {resource} yet.</p>;

  return <ul className="divide-y divide-slate-100">
    {summary.entries.map(entry => (
      <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
        <div className="min-w-0">
          <p className="font-medium wrap-anywhere text-slate-900">{entry.label}</p>
          {entry.customer && <p className="wrap-anywhere">{entry.customer}</p>}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4">
          {entry.amount && <strong className="text-slate-900">{entry.amount}</strong>}
          <time dateTime={entry.date}>{dateFormat.format(new Date(entry.date))}</time>
        </div>
      </li>
    ))}
  </ul>;
}

export default function OverviewPage() {
  const summaries = {
    categories: useSummary("categories"),
    products: useSummary("products"),
    orders: useSummary("orders"),
  };

  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-9 sm:px-8 lg:px-10 lg:py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Overview</h1>
        <section aria-label="Store totals" className="grid gap-4 sm:grid-cols-3">
          {resources.map(resource => {
            const summary = summaries[resource];
            const Icon = icons[resource];
            return <Card key={resource}><CardContent>
              <Icon aria-hidden="true" size={20} className="mb-3 text-slate-500" />
              <p className="text-sm text-slate-600">Total {resource}</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.status === "ready" ? summary.total : summary.status === "loading" ? "Loading…" : "Unavailable"}
              </p>
            </CardContent></Card>;
          })}
        </section>
        {resources.map(resource => (
          <section key={resource} aria-labelledby={`recent-${resource}`}>
            <Card>
              <CardHeader className="flex flex-wrap items-baseline justify-between gap-2 border-b">
                <h2 id={`recent-${resource}`} className="font-semibold">Recent {resource}</h2>
                <Link href={"/" + resource} className="inline-flex items-center gap-1 font-medium hover:underline">
                  {resource === "orders" ? "View orders" : "Manage " + resource} <ArrowRight size={15} />
                </Link>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                <RecentEntries resource={resource} summary={summaries[resource]} />
              </CardContent>
            </Card>
          </section>
        ))}
      </main>
    </AdminShell>
  );
}
