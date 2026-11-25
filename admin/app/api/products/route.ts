import { dashboardProxy } from "@/lib/dashboard-proxy";

function handle(request: Request) {
  return dashboardProxy(request, "/api/products/", "product");
}

export { handle as GET, handle as POST };
