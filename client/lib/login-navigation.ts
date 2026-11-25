export function safeReturnPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/shop";

  const base = "https://storefront.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname.startsWith("//") || /^\/login\/?$/.test(url.pathname)) return "/shop";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/shop";
  }
}
