"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ShopCatalogData } from "@/lib/shop-api";
import { CategoryFilter } from "./category-filter";
import { ShopCatalog } from "./shop-catalog";
import { shopHref } from "./shop-href";

const PRODUCTS_PER_PAGE = 8;

export function ShopResults({ catalog }: { catalog: ShopCatalogData }) {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const selected = catalog.categories.find(({ id }) => id === params.get("category"));
  const [draft, setDraft] = useState(query);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function restoreSearch() {
      clearTimeout(timer.current);
      setDraft(new URLSearchParams(window.location.search).get("q") ?? "");
    }
    window.addEventListener("popstate", restoreSearch);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("popstate", restoreSearch);
    };
  }, []);

  function updateSearch(value: string) {
    setDraft(value);
    clearTimeout(timer.current);
    const href = shopHref(selected?.id, value.trim());
    if (!value.trim()) {
      window.history.replaceState(null, "", href);
      return;
    }
    timer.current = setTimeout(() => window.history.replaceState(null, "", href), 250);
  }

  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const products = catalog.products.filter((product) => {
    if (selected && product.category !== selected.id) return false;
    const text = `${product.title} ${product.category_name || "Uncategorized"}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const page = Number(params.get("page"));
  const currentPage = Number.isInteger(page) && page >= 1 && page <= Math.ceil(products.length / PRODUCTS_PER_PAGE) ? page : 1;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Input ref={input} type="search" aria-label="Search products" placeholder="Search by title or category"
            className="h-10 pr-10 [&::-webkit-search-cancel-button]:hidden" value={draft}
            onChange={(event) => updateSearch(event.target.value)} />
          {draft && <Button type="button" variant="ghost" size="icon" aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => {
              updateSearch("");
              input.current?.focus();
            }}><X aria-hidden="true" /></Button>}
        </div>
        <CategoryFilter categories={catalog.categories} selected={selected} onChange={(id) => {
          clearTimeout(timer.current);
          window.history.pushState(null, "", shopHref(id, draft.trim()));
        }} />
      </div>
      {products.length ? (
        <ShopCatalog products={products} currentPage={currentPage} productsPerPage={PRODUCTS_PER_PAGE} categoryId={selected?.id} query={query} />
      ) : (
        <div className="shop-state" role="status">
          <h2>{terms.length ? "No products match your search" : selected ? "No products in this category" : "No products available yet"}</h2>
          <p>{terms.length ? "Try another title or category." : selected ? "Choose another category to keep browsing." : "Check back soon for the latest collection."}</p>
        </div>
      )}
    </>
  );
}
