import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { StorefrontShell } from "@/components/storefront-shell";
import { getShopCatalog, ShopApiError, type ShopCatalogData } from "@/lib/shop-api";
import { ShopResults } from "./shop-results";

export default async function ShopPage() {
  let catalog: ShopCatalogData | null = null;
  try {
    catalog = await getShopCatalog();
  } catch (cause) {
    if (!(cause instanceof ShopApiError)) throw cause;
  }

  return (
    <StorefrontShell>
      <main className="shop-page">
        <section className="shop-intro section-wrap" aria-labelledby="shop-heading">
          <span className="eyebrow section-eyebrow">THE M-3 COLLECTION</span>
          <h1 id="shop-heading">Find your <span>next favorite.</span></h1>
          <p>Thoughtful tech, selected for your everyday.</p>
        </section>

        <section className="shop-catalog section-wrap" aria-label="Products">
          {catalog ? <ShopResults catalog={catalog} /> : (
            <div className="shop-state" role="alert">
              <h2>Could not load products</h2>
              <p>Please try again in a moment.</p>
              <Link className="shop-back-link" href="/"><ArrowLeft aria-hidden="true" size={16} /> Back to home</Link>
            </div>
          )}
        </section>
      </main>
    </StorefrontShell>
  );
}
