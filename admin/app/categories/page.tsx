import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import AdminShell from "@/components/admin-shell";
import CategoriesManager from "./categories-manager";

export default function CategoriesPage() {
  return (
    <AdminShell>
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-12">
          <div className="mb-7 sm:mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Category management</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Categories</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Organize your products into clear collections for your store.</p>
          </div>
          <CategoriesManager />
          <div className="mt-5 flex justify-end">
            <Link href="/" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900">
              Admin home <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
