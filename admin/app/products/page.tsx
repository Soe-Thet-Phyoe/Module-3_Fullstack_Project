import AdminShell from "@/components/admin-shell";
import ProductsManager from "./products-manager";

export default function ProductsPage() {
  return (
    <AdminShell>
      <main className="min-h-screen min-w-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-9 lg:px-10 lg:py-12">
          <div className="mb-7 sm:mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Product Management</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Products</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Review your product, category, inventory, and pricing.</p>
          </div>
          <ProductsManager />
        </div>
      </main>
    </AdminShell>
  );
}
