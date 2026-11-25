import { StorefrontShell } from "@/components/storefront-shell";

export default function ShopLoading() {
  return (
    <StorefrontShell>
      <main className="shop-page" aria-busy="true" aria-label="Loading products">
        <section className="shop-intro section-wrap">
          <span className="eyebrow section-eyebrow">THE M-3 COLLECTION</span>
          <h1>Find your <span>next favorite.</span></h1>
          <p>Loading the collection…</p>
        </section>
        <section className="shop-catalog section-wrap" aria-hidden="true">
          <div className="shop-product-grid">
            {[1, 2, 3, 4].map((item) => <div className="shop-product-skeleton" key={item} />)}
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
