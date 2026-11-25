"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore } from "react";
import { LogOut, ShoppingCart, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOptionalStorefrontAuth } from "@/components/storefront-auth";
import { safeReturnPath } from "@/lib/login-navigation";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function LoginLink() {
  const pathname = usePathname() || "/";
  const params = useSearchParams();
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => "");
  const query = params?.toString();
  const next = pathname === "/login"
    ? params?.get("next")
    : pathname + (query ? "?" + query : "") + hash;
  const href = next ? "/login?next=" + encodeURIComponent(safeReturnPath(next)) : "/login";
  return <Link href={href} className="header-register-link">Login</Link>;
}

export function StorefrontHeader() {
  const { customer, loading, logout } = useOptionalStorefrontAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      toast.success("You have been logged out.");
    } catch {
      toast.error("Logout failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <div className="announcement-bar">
        <p>Thoughtful tech. Better every day.</p>
        <span>Free delivery on orders over 500,000 MMK</span>
      </div>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand-lockup" href="/" aria-label="M-3 Commerce home">
            <span className="brand-mark">M<span>3</span></span>
            <span className="brand-name">M-3 <span>Commerce</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/#categories">Categories</Link>
            <Link href="/#why-m3">Why M-3</Link>
            {!loading && customer && <Link href="/orders">Order history</Link>}
          </nav>
          <div className="header-actions" aria-busy={loading}>
            {!loading && (customer ? (
              <>
                <Link href="/cart" className="header-action-icon" aria-label="Cart" title="Cart">
                  <ShoppingCart size={20} strokeWidth={1.8} aria-hidden="true" />
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}
                    className="header-action-icon header-account-trigger" aria-label="Account" title="Account">
                    <UserRound size={20} strokeWidth={1.8} aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="header-account-menu">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="header-account-email">{customer.email}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem render={<Link href="/orders" />}>Order history</DropdownMenuItem>
                      <DropdownMenuItem closeOnClick={false} disabled={loggingOut} onClick={() => void handleLogout()}>
                        <LogOut aria-hidden="true" />
                        {loggingOut ? "Logging out…" : "Logout"}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/register" className="header-register-link">Create account</Link>
                <Suspense fallback={<Link href="/login" className="header-register-link">Login</Link>}>
                  <LoginLink />
                </Suspense>
              </>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}
