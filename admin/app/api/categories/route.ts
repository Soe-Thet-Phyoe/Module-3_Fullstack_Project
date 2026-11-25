import { dashboardProxy } from "@/lib/dashboard-proxy";

function handle(request: Request) {
  return dashboardProxy(request, "/api/categories/", "category");
}

export { handle as GET, handle as POST };
