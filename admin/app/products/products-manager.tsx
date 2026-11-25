"use client";

import { dashboardRequest } from "@/lib/dashboard-request";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, ImageOff, LoaderCircle, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Product = {
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
type Category = { id: string; name: string };
type ProductForm = { title: string; price: string; quantity: string; description: string; category: string };
type DialogMode = "create" | "edit";
type ApiError = { error?: string };

const blankForm: ProductForm = { title: "", price: "", quantity: "0", description: "", category: "" };
const PRODUCTS_PER_PAGE = 5;

function formatPrice(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount) : value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

export default function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesSearch = !normalizedQuery
      || product.title.toLocaleLowerCase().includes(normalizedQuery)
      || (product.category_name ?? "").toLocaleLowerCase().includes(normalizedQuery);
    const matchesCategory = selectedCategoryId === "all" || product.category === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });
  const noResultsMessage = normalizedQuery && selectedCategoryId !== "all"
    ? "No products match your search and category."
    : normalizedQuery
      ? "No products match your search."
      : "No products match this category.";
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const activePage = Math.min(currentPage, pageCount);
  const pageProducts = filteredProducts.slice((activePage - 1) * PRODUCTS_PER_PAGE, activePage * PRODUCTS_PER_PAGE);
  const firstProductNumber = filteredProducts.length === 0 ? 0 : (activePage - 1) * PRODUCTS_PER_PAGE + 1;
  const lastProductNumber = Math.min(activePage * PRODUCTS_PER_PAGE, filteredProducts.length);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/products", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, "Could not load products."));
        try {
          const payload = (await response.json()) as { products: Product[] };
          if (!Array.isArray(payload.products)) throw new Error("Invalid response");
          return payload.products;
        } catch {
          throw new Error("The product service returned an invalid response.");
        }
      })
      .then(setProducts)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setListError(error instanceof Error ? error.message : "Could not load products.");
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });

    fetch("/api/categories", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, "Could not load categories."));
        return (await response.json()) as { categories: Category[] };
      })
      .then((payload) => setCategories(Array.isArray(payload.categories) ? payload.categories : []))
      .catch(() => { if (!controller.signal.aborted) setCategories([]); });

    return () => controller.abort();
  }, []);

  function openCreateDialog() {
    setDialogMode("create");
    setEditingProduct(null);
    setForm(blankForm);
    setImageFile(null);
    setClearImage(false);
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditDialog(product: Product) {
    setDialogMode("edit");
    setEditingProduct(product);
    setForm({ title: product.title, price: product.price, quantity: String(product.quantity), description: product.description ?? "", category: product.category ?? "" });
    setImageFile(null);
    setClearImage(false);
    setFormError("");
    setIsModalOpen(true);
  }

  function changeDialogState(open: boolean) {
    if (isSaving) return;
    setIsModalOpen(open);
    if (!open) {
      setFormError("");
      setEditingProduct(null);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) { setFormError("Enter a product title."); return; }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) { setFormError("Enter a valid product price."); return; }
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0) { setFormError("Enter a valid product quantity."); return; }

    const body = new FormData();
    body.set("title", form.title.trim());
    body.set("price", form.price);
    body.set("quantity", form.quantity);
    body.set("description", form.description);
    body.set("category", form.category);
    if (imageFile) body.set("image", imageFile);
    if (clearImage) body.set("clear_image", "true");

    setIsSaving(true);
    setFormError("");
    try {
      const editing = dialogMode === "edit" && editingProduct;
      const response = await dashboardRequest(editing ? `/api/products/${encodeURIComponent(editingProduct.id)}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        body,
      });
      if (!response.ok) throw new Error(await readError(response, `Could not ${dialogMode} product.`));
      let payload: { product: Product };
      try { payload = (await response.json()) as { product: Product }; }
      catch { throw new Error("The product service returned an invalid response."); }
      if (!payload.product?.id) throw new Error("The product service returned an invalid response.");
      setProducts((current) => editing
        ? current.map((product) => product.id === payload.product.id ? payload.product : product)
        : [payload.product, ...current]);
      if (!editing) setCurrentPage(1);
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : `Could not ${dialogMode} product.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProduct() {
    if (!deletingProduct || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await dashboardRequest(`/api/products/${encodeURIComponent(deletingProduct.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response, "Could not delete product."));
      setProducts((current) => current.filter((product) => product.id !== deletingProduct.id));
      setDeletingProduct(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete product.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:max-w-sm">
            <Search aria-hidden="true" size={17} className="shrink-0 text-slate-400" />
            <Input
              type="search"
              aria-label="Search products"
              placeholder="Search by product or category"
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }}
              className="h-11 min-w-0 border-0 px-0 shadow-none focus-visible:ring-0"
            />
            {searchQuery && <Button type="button" variant="ghost" size="sm" aria-label="Clear search" onClick={() => { setSearchQuery(""); setCurrentPage(1); }}><X aria-hidden="true" /></Button>}
          </div>
          <Select value={selectedCategoryId} onValueChange={(value) => { setSelectedCategoryId(String(value)); setCurrentPage(1); }}>
            <SelectTrigger aria-label="Filter by category" className="w-full sm:max-w-56">
              <SelectValue>
                {(value: string) => value === "all" ? "All categories" : categories.find((category) => category.id === value)?.name ?? "All categories"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" size="lg" className="h-11 w-full rounded-lg px-4 sm:h-10 sm:w-auto" onClick={openCreateDialog}>
          <Plus aria-hidden="true" /> Create product
        </Button>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)]" aria-labelledby="product-list-heading">
        <div className="flex items-center justify-between border-b px-4 py-4 sm:px-7 sm:py-5">
          <div><h2 id="product-list-heading" className="font-semibold text-slate-900">All products</h2><p className="mt-1 text-sm text-slate-500">{filteredProducts.length} {normalizedQuery ? "matching " : ""}products</p></div>
          <Package aria-hidden="true" className="text-slate-400" size={19} />
        </div>
        <div className="hidden md:block">
          <Table className="min-w-225 xl:min-w-0">
            <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead scope="col" className="w-14 pl-6 text-xs">No.</TableHead><TableHead scope="col" className="w-20 text-xs">Image</TableHead><TableHead scope="col" className="text-xs">Title</TableHead><TableHead scope="col" className="text-right text-xs">Price</TableHead><TableHead scope="col" className="text-right text-xs">Quantity</TableHead><TableHead scope="col" className="text-xs">Updated at</TableHead><TableHead scope="col" className="text-xs">Created at</TableHead><TableHead scope="col" className="pr-6 text-right text-xs">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pageProducts.map((product, index) => <TableRow key={product.id}>
                <TableCell className="pl-6 font-mono text-xs tabular-nums text-slate-500">{firstProductNumber + index}.</TableCell>
                <TableCell>{product.image ? <img src={product.image} alt={product.title} loading="lazy" className="size-12 rounded-lg border border-slate-200 object-cover" /> : <span className="flex size-12 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400" aria-label="No image"><ImageOff aria-hidden="true" size={17} /><span className="sr-only">No image</span></span>}</TableCell>
                <TableCell className="max-w-64 whitespace-normal py-4 text-sm font-medium text-slate-900">{product.title}</TableCell>
                <TableCell className="text-right text-sm tabular-nums text-slate-700">{formatPrice(product.price)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums text-slate-700">{product.quantity.toLocaleString()}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-500"><time dateTime={product.updated_at}>{formatDateTime(product.updated_at)}</time></TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-500"><time dateTime={product.created_at}>{formatDateTime(product.created_at)}</time></TableCell>
                <TableCell className="pr-6 text-right"><Button type="button" variant="ghost" size="sm" aria-label={`Edit ${product.title}`} onClick={() => openEditDialog(product)}><Pencil aria-hidden="true" /><span className="sr-only">Edit</span></Button><Button type="button" variant="ghost" size="sm" aria-label={`Delete ${product.title}`} onClick={() => { setDeleteError(""); setDeletingProduct(product); }}><Trash2 aria-hidden="true" /><span className="sr-only">Delete</span></Button></TableCell>
              </TableRow>)}
              {isLoading && <TableRow><TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle aria-hidden="true" size={16} className="animate-spin" />Loading products…</span></TableCell></TableRow>}
              {!isLoading && listError && <TableRow><TableCell colSpan={8} role="alert" className="h-24 text-center text-sm text-red-600">{listError}</TableCell></TableRow>}
              {!isLoading && !listError && products.length === 0 && <TableRow><TableCell colSpan={8} className="h-28 text-center text-sm text-slate-500">No products yet. Add products to your catalog to see them here.</TableCell></TableRow>}
              {!isLoading && !listError && products.length > 0 && filteredProducts.length === 0 && <TableRow><TableCell colSpan={8} className="h-28 text-center text-sm text-slate-500">{noResultsMessage}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {pageProducts.map((product, index) => (
            <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex min-w-0 items-start gap-3">
                {product.image ? (
                  <img src={product.image} alt={product.title} loading="lazy" className="size-14 shrink-0 rounded-lg border border-slate-200 object-cover" />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400" aria-label="No image">
                    <ImageOff aria-hidden="true" size={18} /><span className="sr-only">No image</span>
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="wrap-break-word text-sm font-semibold text-slate-900">{product.title}</h3>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">#{firstProductNumber + index}</span>
                  </div>
                  <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">{formatPrice(product.price)}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3 text-xs">
                <div><dt className="text-slate-400">Quantity</dt><dd className="mt-1 font-medium tabular-nums text-slate-700">{product.quantity.toLocaleString()}</dd></div>
                <div><dt className="text-slate-400">Updated</dt><dd className="mt-1 wrap-break-word text-slate-600"><time dateTime={product.updated_at}>{formatDateTime(product.updated_at)}</time></dd></div>
                <div className="col-span-2"><dt className="text-slate-400">Created</dt><dd className="mt-1 wrap-break-word text-slate-600"><time dateTime={product.created_at}>{formatDateTime(product.created_at)}</time></dd></div>
              </dl>
              <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                <Button type="button" variant="ghost" size="sm" className="min-h-10 px-3" aria-label={`Edit ${product.title}`} onClick={() => openEditDialog(product)}><Pencil aria-hidden="true" /><span>Edit</span></Button>
                <Button type="button" variant="ghost" size="sm" className="min-h-10 px-3 text-red-600 hover:text-red-700" aria-label={`Delete ${product.title}`} onClick={() => { setDeleteError(""); setDeletingProduct(product); }}><Trash2 aria-hidden="true" /><span>Delete</span></Button>
              </div>
            </article>
          ))}
          {isLoading && <div className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm text-slate-500"><LoaderCircle aria-hidden="true" size={16} className="animate-spin" />Loading products…</div>}
          {!isLoading && listError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">{listError}</p>}
          {!isLoading && !listError && products.length === 0 && <p className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">No products yet. Add products to your catalog to see them here.</p>}
          {!isLoading && !listError && products.length > 0 && filteredProducts.length === 0 && <p className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">{noResultsMessage}</p>}
        </div>
      </section>

      {!isLoading && !listError && filteredProducts.length > 0 && (
        <nav className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Product pages">
          <p className="text-sm text-slate-500" aria-live="polite">Showing {firstProductNumber}–{lastProductNumber} of {filteredProducts.length} products</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" aria-label="Previous page" disabled={activePage === 1} onClick={() => setCurrentPage(activePage - 1)}>
              <ChevronLeft aria-hidden="true" /> Previous
            </Button>
            <span className="px-2 text-sm tabular-nums text-slate-600" aria-current="page">Page {activePage} of {pageCount}</span>
            <Button type="button" variant="outline" size="sm" aria-label="Next page" disabled={activePage === pageCount} onClick={() => setCurrentPage(activePage + 1)}>
              Next <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}

      <Dialog open={isModalOpen} onOpenChange={changeDialogState}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl" showCloseButton={false}>
          <form onSubmit={saveProduct}>
            <DialogHeader className="p-6 pb-5 sm:p-7 sm:pb-5">
              <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground"><Package aria-hidden="true" size={18} /></span>
              <DialogTitle className="text-lg font-semibold tracking-tight">{dialogMode === "edit" ? "Edit product" : "Create product"}</DialogTitle>
              <DialogDescription>{dialogMode === "edit" ? "Update this product in your catalog." : "Add a product to your catalog."}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 sm:px-7">
              <div className="sm:col-span-2"><label htmlFor="product-title" className="mb-2 block text-sm font-medium">Title</label><Input id="product-title" required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-11 rounded-lg" /></div>
              <div><label htmlFor="product-price" className="mb-2 block text-sm font-medium">Price</label><Input id="product-price" type="number" min="0" step="0.01" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="h-11 rounded-lg" /></div>
              <div><label htmlFor="product-quantity" className="mb-2 block text-sm font-medium">Quantity</label><Input id="product-quantity" type="number" min="0" step="1" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="h-11 rounded-lg" /></div>
              <div className="sm:col-span-2"><label htmlFor="product-category" className="mb-2 block text-sm font-medium">Category</label><select id="product-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
              <div className="sm:col-span-2"><label htmlFor="product-description" className="mb-2 block text-sm font-medium">Description</label><textarea id="product-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" /></div>
              <div className="sm:col-span-2"><label htmlFor="product-image" className="mb-2 block text-sm font-medium">Product image</label><Input id="product-image" type="file" accept="image/*" onChange={(event) => { setImageFile(event.target.files?.[0] ?? null); if (event.target.files?.[0]) setClearImage(false); }} className="h-11 rounded-lg file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1" />
                {editingProduct?.image && !clearImage && !imageFile && <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground"><img src={editingProduct.image} alt="Current product" className="size-12 rounded-md object-cover" /><span>Current image</span><Button type="button" variant="ghost" size="sm" onClick={() => setClearImage(true)}><X aria-hidden="true" />Remove image</Button></div>}
                {clearImage && <p className="mt-2 text-xs text-muted-foreground">The current image will be removed.</p>}
              </div>
              {formError && <p role="alert" className="sm:col-span-2 text-sm text-destructive">{formError}</p>}
            </div>
            <DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4 sm:px-7 [&>button]:min-h-11 sm:[&>button]:min-h-9">
              <DialogClose render={<Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>} />
              <Button type="submit" disabled={isSaving}>{isSaving && <LoaderCircle aria-hidden="true" className="animate-spin" />}{isSaving ? "Saving…" : dialogMode === "edit" ? "Save changes" : "Create product"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deletingProduct !== null} onOpenChange={(open) => { if (!open && !isDeleting) { setDeletingProduct(null); setDeleteError(""); } }}>
        <DialogContent className="rounded-2xl sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete product</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete <span className="font-medium text-foreground">{deletingProduct?.title}</span>? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isDeleting}>Cancel</Button>} />
            <Button type="button" variant="destructive" onClick={deleteProduct} disabled={isDeleting}>
              {isDeleting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {isDeleting ? "Deleting…" : "Delete product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
