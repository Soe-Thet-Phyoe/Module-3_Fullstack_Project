import { dashboardProxy } from "@/lib/dashboard-proxy";

async function handle(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (id === "." || id === "..") return new Response(null, { status: 404 });
  return dashboardProxy(request, `/api/categories/${encodeURIComponent(id)}/`, "category");
}

export { handle as PATCH, handle as DELETE };
