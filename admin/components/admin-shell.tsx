"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Menu, Package, ReceiptText, Tag } from "lucide-react";

import { AccountControls } from "@/components/account-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/orders", label: "Orders", icon: ReceiptText },
];

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="space-y-1">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-12 flex items-center gap-3 px-2"
        aria-label="M-3 Admin home"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">M3</span>
        <span>
          <span className="block text-sm font-semibold tracking-tight">M-3 Commerce</span>
          <span className="mt-0.5 block text-xs text-slate-500">Admin workspace</span>
        </span>
      </Link>
      <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
      <NavigationLinks onNavigate={onNavigate} />
      <div className="mt-auto mb-10 rounded-2xl bg-slate-50 p-4">
        <div className="mb-2 mx-20 flex size-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm"><Boxes size={16} /></div>
        <p className="text-xs font-semibold text-slate-800">Engineered by Soe Thet Phyoe</p>
        
      </div>
    </>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pathname = usePathname();
  const current = navigation.find(item => item.href === pathname);
  const PageIcon = current?.icon ?? LayoutDashboard;
  const isCatalog = pathname === "/categories" || pathname === "/products";

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-7 xl:flex">
        <SidebarContents />
      </aside>

      <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <DialogContent
          id="admin-mobile-navigation"
          aria-label="Admin navigation menu"
          className="fixed! inset-y-0! left-0! right-auto! top-0! h-dvh! max-h-dvh! w-72! max-w-[calc(100vw_-_2rem)! translate-x-0! translate-y-0! gap-0! overflow-y-auto! overscroll-contain! rounded-none! p-5!"
        >
          <DialogTitle className="sr-only">Admin navigation</DialogTitle>
          <div className="flex min-h-full flex-col pt-3">
            <SidebarContents onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen xl:ml-64">
        <header className="flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
            <Button type="button" variant="ghost" size="icon-lg" className="size-11 shrink-0 xl:hidden"
              aria-label="Open admin navigation" aria-controls="admin-mobile-navigation"
              aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(true)}>
              <Menu aria-hidden="true" />
            </Button>
            <PageIcon size={15} aria-hidden="true" className="hidden shrink-0 sm:block" />
            
            <span className="truncate font-medium text-slate-700">{current?.label}</span>
          </div>
          <AccountControls />
        </header>
        {children}
      </div>
    </div>
  );
}
