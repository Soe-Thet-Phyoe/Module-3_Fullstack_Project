export function shopHref(category?: string, query = "", page?: number) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (query) params.set("q", query);
  if (page) params.set("page", String(page));
  return params.size ? `/shop?${params}` : "/shop";
}
