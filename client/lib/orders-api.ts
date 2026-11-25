import type { CartItem } from "./cart-api";
import { csrfToken } from "./csrf";

export type Order = {
  id: string;
  created_at: string;
  items: Pick<CartItem, "product_id" | "title" | "price" | "quantity" | "line_total">[];
  total: string;
};

export type OrderHistory = { orders: Order[]; page: number; pages: number };

export class OrderApiError extends Error {
  constructor(message: string, readonly status: number, readonly available?: number) { super(message); }
}

async function orderRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const available = body?.available;
    throw new OrderApiError(body?.error ?? "Could not complete your request.", response.status,
      Number.isInteger(available) && available >= 0 ? available : undefined);
  }
  return response;
}

export async function placeOrder() {
  await orderRequest("/api/orders", { method: "POST", headers: { "X-CSRFToken": csrfToken() } });
}

export async function buyNow(productId: string, quantity: number) {
  await orderRequest("/api/orders/buy-now", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken() },
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function getOrderHistory(page: number): Promise<OrderHistory> {
  const response = await orderRequest(`/api/orders?page=${page}`);
  return response.json();
}
