"use client";

import { dashboardRequest } from "@/lib/dashboard-request";

import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { LoaderCircle, Package, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Category = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
type ApiError = { error?: string };
type DialogMode = "create" | "edit";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredCategories = normalizedSearchQuery
    ? categories.filter((category) =>
        category.name.toLocaleLowerCase().includes(normalizedSearchQuery),
      )
    : categories;

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/categories", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readError(response, "Could not load categories."));
        }
        try {
          return (await response.json()) as { categories: Category[] };
        } catch {
          throw new Error("The category service returned an invalid response.");
        }
      })
      .then((payload) => setCategories(payload.categories))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setListError(
          error instanceof Error
            ? error.message
            : "Could not load categories. Check that the server is running, then refresh this page.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  function changeDialogState(open: boolean) {
    if (isSaving) return;
    setIsModalOpen(open);
    if (!open) {
      setFormError("");
      setEditingCategory(null);
    }
  }

  function openCreateDialog() {
    setDialogMode("create");
    setEditingCategory(null);
    setFormError("");
    setCategoryName("");
    setIsModalOpen(true);
  }

  function openEditDialog(category: Category) {
    setDialogMode("edit");
    setEditingCategory(category);
    setFormError("");
    setCategoryName(category.name);
    setIsModalOpen(true);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) {
      setFormError("Enter a category name.");
      return;
    }
    if (name.length > 255) {
      setFormError("Category name must be 255 characters or fewer.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const isEditing = dialogMode === "edit" && editingCategory;
      const response = await dashboardRequest(
        isEditing ? `/api/categories/${encodeURIComponent(editingCategory.id)}` : "/api/categories",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      if (!response.ok) {
        throw new Error(await readError(response, `Could not ${dialogMode} category.`));
      }

      let payload: { category: Category };
      try {
        payload = (await response.json()) as { category: Category };
      } catch {
        throw new Error("The category service returned an invalid response.");
      }
      setCategories((current) =>
        dialogMode === "edit"
          ? current.map((category) => category.id === payload.category.id ? payload.category : category)
          : [payload.category, ...current],
      );
      setCategoryName("");
      setEditingCategory(null);
      setIsModalOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : `Could not ${dialogMode} category.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory() {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await dashboardRequest(`/api/categories/${encodeURIComponent(deletingCategory.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response, "Could not delete category."));
      setCategories((current) => current.filter((category) => category.id !== deletingCategory.id));
      setDeletingCategory(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete category.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex h-10 w-full items-center gap-2 rounded-lg border bg-card px-3.5 text-sm text-muted-foreground shadow-sm sm:w-auto">
          <Package aria-hidden="true" size={16} />
          <span>
            <strong className="font-semibold text-foreground">{categories.length}</strong>{" "}
            total categories
          </span>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-11 w-full rounded-lg px-4 sm:h-10 sm:w-auto"
          onClick={openCreateDialog}
        >
          <Plus aria-hidden="true" />
          Create category
        </Button>
      </div>

      <div className="mb-5">
        <label htmlFor="category-search" className="sr-only">
          Search categories
        </label>
        <div className="relative w-full sm:max-w-sm">
          <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="category-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search categories..."
            className="h-11 rounded-lg pl-10"
          />
        </div>
      </div>

      <Card className="gap-0 rounded-2xl py-0 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
        <CardHeader className="border-b px-4 py-4 sm:px-7 sm:py-5">
          <CardTitle>
            <h2 id="category-list-heading">All categories</h2>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y xl:hidden" aria-labelledby="category-list-heading">
            {filteredCategories.map((category, index) => (
              <motion.article
                key={category.id}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                className="min-w-0 p-4 sm:p-5"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{index + 1}.</span>
                    <h3 className="min-w-0 wrap-break-word text-sm font-medium text-foreground">{category.name}</h3>
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-1">
                    <Button type="button" variant="ghost" size="icon-lg" className="size-11" aria-label={`Edit ${category.name}`} onClick={() => openEditDialog(category)}>
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="size-11"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => {
                        setDeleteError("");
                        setDeletingCategory(category);
                      }}
                    >
                      <Trash2 aria-hidden="true" className="text-destructive" />
                    </Button>
                  </div>
                </div>
                <dl className="mt-3 grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 pl-6 text-xs sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="mb-1 text-muted-foreground">Updated</dt>
                    <dd className="wrap-break-word font-medium text-foreground"><time dateTime={category.updated_at}>{formatDateTime(category.updated_at)}</time></dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="mb-1 text-muted-foreground">Created</dt>
                    <dd className="wrap-break-word font-medium text-foreground"><time dateTime={category.created_at}>{formatDateTime(category.created_at)}</time></dd>
                  </div>
                </dl>
              </motion.article>
            ))}
            {isLoading && (
              <div className="flex min-h-24 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
                  Loading categories…
                </span>
              </div>
            )}
            {!isLoading && listError && <p role="alert" className="px-4 py-6 text-center text-sm text-destructive">{listError}</p>}
            {!isLoading && !listError && categories.length === 0 && <p className="px-4 py-7 text-center text-sm text-muted-foreground">No categories yet. Create your first category to get started.</p>}
            {!isLoading && !listError && categories.length > 0 && filteredCategories.length === 0 && <p className="px-4 py-7 text-center text-sm text-muted-foreground">No categories match &quot;{searchQuery.trim()}&quot;.</p>}
          </div>

          <div className="hidden xl:block">
          <Table className="min-w-190">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead scope="col" className="h-11 pl-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  No.
                </TableHead>
                <TableHead scope="col" className="h-11 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </TableHead>
                <TableHead scope="col" className="h-11 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Updated at
                </TableHead>
                <TableHead scope="col" className="h-11 pr-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Created at
                </TableHead>
                <TableHead scope="col" className="h-11 pr-7 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category, index) => (
                <motion.tr
                  key={category.id}
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                  className="border-b transition-colors hover:bg-muted/30 last:border-0"
                >
                  <TableCell className="pl-7 py-4 font-mono text-xs tabular-nums text-muted-foreground">
                    {index + 1}.
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-foreground">
                    {category.name}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-xs text-muted-foreground">
                    <time dateTime={category.updated_at}>{formatDateTime(category.updated_at)}</time>
                  </TableCell>
                  <TableCell className="px-5 py-4 pr-7 text-xs text-muted-foreground">
                    <time dateTime={category.created_at}>{formatDateTime(category.created_at)}</time>
                  </TableCell>
                  <TableCell className="px-5 py-3 pr-7 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" aria-label={`Edit ${category.name}`} onClick={() => openEditDialog(category)}>
                        <Pencil aria-hidden="true" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => {
                          setDeleteError("");
                          setDeletingCategory(category);
                        }}
                      >
                        <Trash2 aria-hidden="true" className="text-destructive" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
                      Loading categories…
                    </span>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && listError && (
                <TableRow>
                  <TableCell colSpan={5} role="alert" className="h-24 text-center text-sm text-destructive">
                    {listError}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !listError && categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                    No categories yet. Create your first category to get started.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !listError && categories.length > 0 && filteredCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                    No categories match &quot;{searchQuery.trim()}&quot;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>

        <div className="flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredCategories.length ? 1 : 0}–{filteredCategories.length}</span> of{" "}
            <span className="font-medium text-foreground">{categories.length}</span> categories
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Changes are saved.
          </p>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={changeDialogState}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl p-0 sm:max-w-md" showCloseButton={false}>
          <form onSubmit={saveCategory}>
            <DialogHeader className="p-6 pb-5 sm:p-7 sm:pb-5">
              <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                <Tag aria-hidden="true" size={18} />
              </span>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {dialogMode === "edit" ? "Edit category" : "Create category"}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === "edit"
                  ? "Update this category in your product catalog."
                  : "Add a new category to your product catalog."}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 sm:px-7">
              <label htmlFor="category-name" className="mb-2 block text-sm font-medium">
                Category name
              </label>
              <Input
                id="category-name"
                name="name"
                autoFocus
                required
                maxLength={255}
                value={categoryName}
                onChange={(event) => {
                  setCategoryName(event.target.value);
                  if (formError) setFormError("");
                }}
                placeholder="e.g. Accessories"
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? "category-form-error" : "category-name-hint"}
                className="h-11 rounded-lg px-3.5"
              />
              {formError ? (
                <p id="category-form-error" role="alert" className="mt-2 text-xs text-destructive">
                  {formError}
                </p>
              ) : (
                <p id="category-name-hint" className="mt-2 text-xs text-muted-foreground">
                  A URL-friendly slug will be generated from this name.
                </p>
              )}
            </div>

            <DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4 sm:px-7">
              <DialogClose
                render={
                  <Button type="button" variant="outline" className="min-h-11 sm:min-h-9" disabled={isSaving}>
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" className="min-h-11 sm:min-h-9" disabled={isSaving}>
                {isSaving && <LoaderCircle aria-hidden="true" className="animate-spin" />}
                {isSaving
                  ? dialogMode === "edit" ? "Saving…" : "Creating…"
                  : dialogMode === "edit" ? "Save changes" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeletingCategory(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl p-0 sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="p-6 pb-5 sm:p-7 sm:pb-5">
            <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" size={18} />
            </span>
            <DialogTitle className="text-lg font-semibold tracking-tight">Delete category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{deletingCategory?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p role="alert" className="px-6 text-sm text-destructive sm:px-7">{deleteError}</p>}
          <DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4 sm:px-7">
            <DialogClose render={<Button type="button" className="min-h-11 sm:min-h-9" variant="outline" disabled={isDeleting}>Cancel</Button>} />
            <Button type="button" variant="destructive" className="min-h-11 sm:min-h-9" disabled={isDeleting} onClick={deleteCategory}>
              {isDeleting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {isDeleting ? "Deleting…" : "Delete category"}
            </Button>
          </DialogFooter>

\
        </DialogContent>
      </Dialog>
    </>
  );
}
