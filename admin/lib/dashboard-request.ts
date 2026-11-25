export function dashboardRequest(url: string, init: RequestInit) {
  const csrf = document.cookie.split("; ").find(cookie => cookie.startsWith("dashboard_csrf="));
  const headers = new Headers(init.headers);
  if (csrf) headers.set("X-CSRFToken", csrf.slice("dashboard_csrf=".length));
  return fetch(url, { ...init, headers, cache: "no-store" });
}

