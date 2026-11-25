"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";

import { StorefrontShell } from "@/components/storefront-shell";
import { useOptionalStorefrontAuth } from "@/components/storefront-auth";
import { Button } from "@/components/ui/button";
import { CartApiError, getCart, removeItem, updateItem, type Cart } from "@/lib/cart-api";
import { formatShopPrice } from "@/lib/shop-api";
import { OrderApiError, placeOrder } from "@/lib/orders-api";

const loginPath = "/login?next=%2Fcart";

function CustomerCart() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [placing, setPlacing] = useState(false);
  const busy = saving || placing;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getCart().then(result => { if (active) setCart(result); }).catch(cause => {
      if (!active) return;
      if (cause instanceof CartApiError && cause.status === 401) router.replace(loginPath);
      else setError("Your cart could not be loaded.");
    });
    return () => { active = false; };
  }, [attempt, router]);

  async function change(id: string, quantity?: number) {
    setSaving(true);
    setError("");
    try {
      setCart(await (quantity === undefined ? removeItem(id) : updateItem(id, quantity)));
    } catch (cause) {
      if (cause instanceof CartApiError && cause.status === 401) router.replace(loginPath);
      else setError(cause instanceof Error ? cause.message : "Your cart could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function checkout() {
    setPlacing(true);
    setError("");
    try {
      await placeOrder();
      setCart({ items: [], total: "0.00" });
      setPlacing(false);
      router.replace("/orders");
    } catch (cause) {
      if (cause instanceof OrderApiError && cause.status === 401) {
        router.replace(loginPath);
        return;
      }
      setError(cause instanceof OrderApiError ? cause.message : "Could not confirm your order. Check your order history before trying again.");
      if (cause instanceof OrderApiError && [400, 409].includes(cause.status)) {
        setCart(null);
        setAttempt(value => value + 1);
      }
      setPlacing(false);
    }
  }

  return <>
    {error && <div role="alert" className="cart-feedback">
      <p>{error}</p>
      <Button variant="outline" onClick={() => { setError(""); setCart(null); setAttempt(value => value + 1); }}>Retry loading cart</Button>
    </div>}
    {!cart && !error && <p role="status">Loading your cart…</p>}
    {cart && (cart.items.length === 0 ? <div className="shop-state">
      <h2>Your cart is empty</h2>
      <Link className="shop-back-link" href="/shop">Continue shopping</Link>
    </div> : <>
      <ul className="cart-lines" aria-label="Cart items" aria-busy={busy}>
        {cart.items.map(item => (
          <li key={item.product_id}>
            <div className="cart-product">
              <div className="cart-thumbnail">
                {item.image ? (
                  <Image src={item.image} alt={item.title} width={64} height={64} unoptimized />
                ) : (
                  <span className="shop-product-image-fallback" role="img" aria-label="Product image unavailable">
                    <ImageOff aria-hidden="true" size={18} /><span>Image unavailable</span>
                  </span>
                )}
              </div>
              <div><h2>{item.title}</h2><p>{formatShopPrice(item.price)} each</p>
                {item.quantity > item.stock && <p role="status">Only {item.stock} available</p>}
              </div>
            </div>
            <div className="shop-quantity-control">
              <Button variant="ghost" size="icon" aria-label={`Decrease quantity for ${item.title}`} disabled={busy || item.quantity <= 1 || item.stock === 0} onClick={() => change(item.product_id, Math.min(item.stock, item.quantity - 1))}><Minus /></Button>
              <output aria-label={`Quantity for ${item.title}`}>{item.quantity}</output>
              <Button variant="ghost" size="icon" aria-label={`Increase quantity for ${item.title}`} disabled={busy || item.quantity >= item.stock} onClick={() => change(item.product_id, item.quantity + 1)}><Plus /></Button>
            </div>
            <strong>{formatShopPrice(item.line_total)}</strong>
            <Button variant="ghost" size="icon" aria-label={`Remove ${item.title}`} disabled={busy} onClick={() => change(item.product_id)}><Trash2 /></Button>
          </li>
        ))}
      </ul>
      <div className="cart-total"><span>Cart total</span><strong>{formatShopPrice(cart.total)}</strong></div>
      <div className="mt-4 flex justify-end"><Button type="button" onClick={checkout}
        disabled={busy || cart.items.some(item => item.quantity > item.stock)}>
        {placing ? "Placing order…" : "Place order"}
      </Button></div>
    </>)}
  </>;
}

export default function CartPage() {
  const { customer, loading } = useOptionalStorefrontAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !customer) router.replace(loginPath);
  }, [customer, loading, router]);
  return <StorefrontShell>
    <main className="cart-page section-wrap">
      <h1>Your cart</h1>
      {customer ? <CustomerCart key={customer.email} /> : <p role="status">{loading ? "Loading your cart…" : "Opening login…"}</p>}
    </main>
  </StorefrontShell>;
}

