import AdminShell from "@/components/admin-shell";
import OrdersList from "./orders-list";

export const metadata = { title: "Orders | M-3 Admin" };

export default function OrdersPage() {
  return (
    <AdminShell>
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-12">
        <h1 className="mb-7 text-2xl font-semibold tracking-tight sm:text-3xl">Order Management</h1>
        <OrdersList />
      </main>
    </AdminShell>
  );
}
