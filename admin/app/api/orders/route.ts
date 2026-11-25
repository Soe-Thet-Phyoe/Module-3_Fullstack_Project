import { dashboardProxy } from "@/lib/dashboard-proxy";

export async function GET(request: Request) {
  const params = new URLSearchParams();
  const page = new URL(request.url).searchParams.get("page");
  if (page) params.set("page", page);
  const query = params.size ? "?" + params : "";
  const response = await dashboardProxy(request, "/api/admin/orders/" + query, "orders");
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Orders could not be loaded." }, {
      status: response.ok ? 502 : response.status, headers: { "Cache-Control": "private, no-store" },
    });
  }
  return response;
}
