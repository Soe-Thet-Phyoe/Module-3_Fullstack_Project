import { csrfToken } from "./csrf";

export type CartItem = {
  product_id: string;
  title: string;
  image: string | null;
  price: string;
  quantity: number;
  stock: number;
  line_total: string;
};

export type Cart = { items: CartItem[]; total: string };

export class CartApiError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

async function requestCart(path: string, method = "GET", data?: object): Promise<Cart> {
  const headers: Record<string, string> = {};
  if (method !== "GET") {
    headers["X-CSRFToken"] = csrfToken();
    if (data) headers["Content-Type"] = "application/json";
  }
  let response: Response;
  try {
    response = await fetch(path, { method, headers, body: JSON.stringify(data), cache: "no-store" });
  } catch {
    throw new CartApiError("Could not reach your cart. Please try again.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(payload?.items) || typeof payload.total !== "string") {
    throw new CartApiError(typeof payload?.error === "string" ? payload.error : "Could not load your cart. Please try again.", response.status);
  }
  return payload;
}

export const getCart = () => requestCart("/api/cart");
export const addItem = (product_id: string, quantity: number) =>
  requestCart("/api/cart/items", "POST", { product_id, quantity });
export const updateItem = (id: string, quantity: number) =>
  requestCart(`/api/cart/items/${encodeURIComponent(id)}`, "PATCH", { quantity });
export const removeItem = (id: string) =>
  requestCart(`/api/cart/items/${encodeURIComponent(id)}`, "DELETE");

