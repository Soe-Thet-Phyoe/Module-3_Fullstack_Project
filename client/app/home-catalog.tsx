import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ImageOff, Tag } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatShopPrice, getShopCatalog, ShopApiError, type ShopProduct } from "@/lib/shop-api";
import { shopHref } from "./shop/shop-href";

function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <Card className="product-card">
      <Link href={`/shop/${encodeURIComponent(product.id)}`} className="product-art-link" aria-label={`View ${product.title} details`}>
        <div className="shop-product-image-link">
          {product.image ? (
            <Image className="shop-product-image" src={product.image} alt={product.title} width={600} height={600} unoptimized />
          ) : (
            <span className="shop-product-image-fallback"><ImageOff aria-hidden="true" size={30} />Image unavailable</span>
          )}
        </div>
        <CardContent className="product-info">
          <div className="product-copy"><h3>{product.title}</h3></div>
          <p className="product-price">{formatShopPrice(product.price)}</p>
        </CardContent>
      </Link>
    </Card>
  );
}

export default async function HomeCatalog() {
  let catalog;
  try {
    catalog = await getShopCatalog();
  } catch (cause) {
    if (!(cause instanceof ShopApiError)) throw cause;
    return (
      <section id="categories" className="category-section section-wrap">
        <p role="alert">The catalog is temporarily unavailable. Please try again in a moment.</p>
      </section>
    );
  }

  return (
    <>
      <section className="category-section section-wrap" id="categories">
        <div className="section-heading">
          <div><span className="eyebrow section-eyebrow">A LITTLE BIT OF EVERYTHING</span><h2>Find your kind of <span>tech.</span></h2></div>
          <Link className="section-link" href="/shop">See everything <ArrowUpRight aria-hidden="true" size={17} /></Link>
        </div>
        {catalog.categories.length ? (
          <div className="category-grid">
            {catalog.categories.slice(0, 4).map((category) => (
              <Link href={shopHref(category.id)} className="category-card" key={category.id}>
                <div className="category-icon"><Tag aria-hidden="true" size={21} strokeWidth={1.7} /></div>
                <div className="category-copy"><h3>{category.name}</h3></div>
                <span className="category-arrow"><ArrowUpRight aria-hidden="true" size={16} /></span>
              </Link>
            ))}
          </div>
        ) : <p>No categories yet.</p>}
      </section>

      <section className="featured-section">
        <div className="section-wrap">
          <div className="section-heading featured-heading">
            <h2>Latest <span>arrivals</span></h2>
            <Link className="section-link" href="/shop">Meet the whole collection <ArrowUpRight aria-hidden="true" size={17} /></Link>
          </div>
          {catalog.products.length ? (
            <div className="product-grid">
              {catalog.products.slice(0, 4).map((product) => <ProductCard product={product} key={product.id} />)}
            </div>
          ) : <p>No products available yet.</p>}
        </div>
      </section>
    </>
  );
}
