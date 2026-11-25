import { ArrowLeft, ImageOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { StorefrontShell } from "@/components/storefront-shell";
import { formatShopPrice, getShopProduct, ShopApiError } from "@/lib/shop-api";

export default async function ProductDetailPage({ params }: PageProps<"/shop/[id]">) {
  const { id } = await params;
  let product;
  let error: "not-found" | "load" | null = null;

  try {
    product = await getShopProduct(id);
  } catch (cause) {
    if (!(cause instanceof ShopApiError)) throw cause;
    error = cause.status === 404 ? "not-found" : "load";
  }

  return (
    <StorefrontShell>
      <main className="shop-detail-page section-wrap">
        {error ? (
          <section className="shop-state" role="alert">
            <h1>{error === "not-found" ? "Product could not be found" : "Could not load this product"}</h1>
            <p>{error === "not-found" ? "It may have been removed from the collection." : "Please try again in a moment."}</p>
            <Link className="shop-back-link" href="/shop"><ArrowLeft aria-hidden="true" size={16} /> Back to shop</Link>
          </section>
        ) : product ? (
          <>
            <Link className="shop-back-link shop-detail-back" href="/shop"><ArrowLeft aria-hidden="true" size={16} /> Back to shop</Link>
            <article className="shop-detail-card">
              <div className="shop-detail-image-wrap">
                {product.image ? (
                  <Image className="shop-detail-image" src={product.image} alt={product.title} width={900} height={900} unoptimized />
                ) : (
                  <div className="shop-product-image-fallback" aria-label="Product image unavailable"><ImageOff aria-hidden="true" size={36} /><span>Image unavailable</span></div>
                )}
              </div>
              <div className="shop-detail-content">
                <span className="shop-product-category">{product.category_name || "Uncategorized"}</span>
                <h1>{product.title}</h1>
                <p className="shop-detail-price">{formatShopPrice(product.price)}</p>
                <p className="shop-detail-description">{product.description || "No description is available for this product."}</p>
              </div>
            </article>
          </>
        ) : null}
      </main>
    </StorefrontShell>
  );
}
