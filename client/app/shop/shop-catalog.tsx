"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ImageOff, Minus, Plus, X } from "lucide-react";

import { formatShopPrice, type ShopProduct } from "@/lib/shop-api";
import { addItem, CartApiError } from "@/lib/cart-api";
import { buyNow, OrderApiError } from "@/lib/orders-api";
import { useOptionalStorefrontAuth } from "@/components/storefront-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

import { shopHref } from "./shop-href";

export function ShopCatalog({ products, currentPage, productsPerPage, categoryId, query }: { products: ShopProduct[]; currentPage: number; productsPerPage: number; categoryId?: string; query: string }) {
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const { customer, loading } = useOptionalStorefrontAuth();
  const router = useRouter();
  const [notice, setNotice] = useState("");

  function openProduct(product: ShopProduct) {
    setSelectedProduct(product);
    setQuantity(product.quantity > 0 ? 1 : 0);
    setNotice("");
  }

  async function submitProduct(action: "cart" | "buy") {
    if (!selectedProduct || saving || loading || quantity < 1) return;
    const loginPath = "/login?next=" + encodeURIComponent("/shop" + window.location.search);
    if (!customer) { router.push(loginPath); return; }
    setSaving(true);
    setNotice("");
    try {
      if (action === "buy") {
        await buyNow(selectedProduct.id, quantity);
        router.push("/orders");
        return;
      }
      await addItem(selectedProduct.id, quantity);
      setNotice(`${selectedProduct.title} added to cart.`);
    } catch (error) {
      if ((error instanceof CartApiError || error instanceof OrderApiError) && error.status === 401) {
        router.push(loginPath);
        return;
      }
      if (error instanceof OrderApiError && error.status === 409 && error.available !== undefined) {
        setSelectedProduct({ ...selectedProduct, quantity: error.available });
        setQuantity(Math.min(quantity, error.available));
      }
      setNotice(error instanceof Error ? error.message : "Could not complete your request.");
    }
    setSaving(false);
  }

  const total = selectedProduct ? Number(selectedProduct.price) * quantity : 0;
  const pageCount = Math.ceil(products.length / productsPerPage);
  const firstProductNumber = (currentPage - 1) * productsPerPage + 1;
  const lastProductNumber = Math.min(currentPage * productsPerPage, products.length);
  const visibleProducts = products.slice(firstProductNumber - 1, lastProductNumber);

  function pageHref(page: number) {
    return shopHref(categoryId, query, page);
  }

  return (
    <>
      <div className="shop-product-grid">
        {visibleProducts.map((product) => (
          <Link
            className="shop-product-card"
            href={`/shop/${encodeURIComponent(product.id)}`}
            aria-label={`View ${product.title} details`}
            key={product.id}
            onClick={(event) => {
              if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              openProduct(product);
            }}
          >
            <span className="shop-product-image-link">
              {product.image ? (
                <Image className="shop-product-image" src={product.image} alt={product.title} width={600} height={600} unoptimized loading="lazy" />
              ) : (
                <span className="shop-product-image-fallback" aria-label="Product image unavailable"><ImageOff aria-hidden="true" size={30} /><span>Image unavailable</span></span>
              )}
            </span>
            <div className="shop-product-content">
              <div className="shop-product-heading">
                <h2>{product.title}</h2>
                <p className="shop-product-category">{product.category_name || "Uncategorized"}</p>
              </div>
              <p className="shop-product-price">{formatShopPrice(product.price)}</p>
              <span className="shop-detail-button w-full">
                Detail <ArrowRight aria-hidden="true" size={15} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="shop-pagination-row">
        <p className="shop-pagination-summary" aria-live="polite">Showing {firstProductNumber}–{lastProductNumber} of {products.length} products</p>
        {pageCount > 1 && (
          <Pagination aria-label="Product pagination" className="shop-pagination">
            <PaginationContent>
              {currentPage > 1 && <PaginationItem><PaginationPrevious href={pageHref(currentPage - 1)} /></PaginationItem>}
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink href={pageHref(page)} aria-label={`Page ${page}`} isActive={page === currentPage}>{page}</PaginationLink>
                </PaginationItem>
              ))}
              {currentPage < pageCount && <PaginationItem><PaginationNext href={pageHref(currentPage + 1)} /></PaginationItem>}
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => { if (!open && !saving) setSelectedProduct(null); }}>
        {selectedProduct && (
          <DialogContent showCloseButton={false} className="shop-product-modal" aria-describedby="shop-modal-description">
            <DialogClose render={<Button className="shop-modal-close" variant="outline" size="icon" aria-label="Close product details" />}>
              <X aria-hidden="true" size={18} />
            </DialogClose>
            <div className="shop-modal-image-wrap">
              {selectedProduct.image ? (
                <Image className="shop-modal-image" src={selectedProduct.image} alt={selectedProduct.title} width={800} height={800} unoptimized />
              ) : (
                <div className="shop-product-image-fallback" aria-label="Product image unavailable"><ImageOff aria-hidden="true" size={36} /><span>Image unavailable</span></div>
              )}
            </div>
            <div className="shop-modal-content">
              <span className="shop-product-category">{selectedProduct.category_name || "Uncategorized"}</span>
              <DialogTitle id="shop-modal-title">{selectedProduct.title}</DialogTitle>
              <DialogDescription id="shop-modal-description" className="shop-detail-description">{selectedProduct.description || "No description is available for this product."}</DialogDescription>
              <p className="shop-modal-stock" role="status">{selectedProduct.quantity > 0 ? `Stock: ${selectedProduct.quantity}` : "Out of stock"}</p>
              <div className="shop-quantity-row">
                <span>Quantity</span>
                <div className="shop-quantity-control" aria-label="Quantity">
                  <Button variant="ghost" size="icon" type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={saving || quantity <= 1}><Minus aria-hidden="true" size={16} /></Button>
                  <output aria-live="polite" aria-label="Selected quantity">{quantity}</output>
                  <Button variant="ghost" size="icon" type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(selectedProduct.quantity, value + 1))} disabled={saving || quantity >= selectedProduct.quantity}><Plus aria-hidden="true" size={16} /></Button>
                </div>
              </div>
              <div className="shop-modal-total"><span>Total</span><strong>{formatShopPrice(String(total))}</strong></div>
              <div className="shop-modal-actions">
                <Button className="shop-cart-button" variant="outline" type="button" onClick={() => submitProduct("cart")} disabled={saving || loading || selectedProduct.quantity < 1}>Add to cart</Button>
                <Button className="shop-buy-button" type="button" onClick={() => submitProduct("buy")} disabled={saving || loading || selectedProduct.quantity < 1}>Buy now</Button>
              </div>
              {notice && <p className="shop-cart-notice" role="status">{notice}</p>}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
