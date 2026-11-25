import { dashboardProxy } from "@/lib/dashboard-proxy";

type Context = { params: Promise<{ action: string }> };
async function handle(request: Request, context: Context) {
  const { action } = await context.params;
  if (!["login", "logout", "session"].includes(action)) return new Response(null, { status: 404 });
  return dashboardProxy(request, `/api/admin/auth/${action}/`, "authentication");
}
export { handle as GET, handle as POST };

