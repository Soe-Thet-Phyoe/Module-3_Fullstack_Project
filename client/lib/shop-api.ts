export type ShopProduct = {
  id: string;
  title: string;
  price: string;
  quantity: number;
  image: string | null;
  description: string;
  category: string | null;
  category_name: string | null;
  created_at: string;
  updated_at: string;
};

export class ShopApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ShopApiError";
  }
}

const apiBaseUrl = (process.env.DJANGO_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ShopApiError("The product service returned an invalid response.", response.status);
  }
}

export type ShopCategory = { id: string; name: string };
export type ShopCatalogData = { products: ShopProduct[]; categories: ShopCategory[] };

function isShopCategory(value: unknown): value is ShopCategory {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "name" in value && typeof value.name === "string";
}

export async function getShopCatalog(): Promise<ShopCatalogData> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/shop/products/`, { cache: "no-store" });
  } catch {
    throw new ShopApiError("The product service is unavailable.");
  }
  if (!response.ok) throw new ShopApiError("Products could not be loaded.", response.status);

  const payload = await readJson(response);
  if (!payload || typeof payload !== "object" ||
      !("products" in payload) || !Array.isArray(payload.products) ||
      !("categories" in payload) || !Array.isArray(payload.categories) || !payload.categories.every(isShopCategory)) {
    throw new ShopApiError("The product service returned an invalid response.", response.status);
  }
  return { products: payload.products, categories: payload.categories };
}

export async function getShopProduct(id: string): Promise<ShopProduct> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/shop/products/${encodeURIComponent(id)}/`, { cache: "no-store" });
  } catch {
    throw new ShopApiError("The product service is unavailable.");
  }
  if (!response.ok) throw new ShopApiError(response.status === 404 ? "Product not found." : "Product could not be loaded.", response.status);

  const payload = await readJson(response);
  if (!payload || typeof payload !== "object" || !(payload as { product?: unknown }).product || typeof (payload as { product: unknown }).product !== "object") {
    throw new ShopApiError("The product service returned an invalid response.", response.status);
  }
  return (payload as { product: ShopProduct }).product;
}

export function formatShopPrice(price: string): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return `MMK ${price}`;
  return `MMK ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}`;
}
