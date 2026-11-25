import { NextRequest, NextResponse } from "next/server";
import { dashboardProxy } from "@/lib/dashboard-proxy";

export async function proxy(request: NextRequest) {
  if (request.cookies.has("dashboard_session")) {
    const check = new Request(request.url, { headers: { cookie: request.headers.get("cookie") ?? "" } });
    const response = await dashboardProxy(check, "/api/admin/auth/session/", "authentication");
    if (!response.ok) return new Response("Admin sign-in service unavailable.", {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
    if ((await response.json()).authenticated === true) {
      const next = NextResponse.next();
      next.headers.set("Cache-Control", "private, no-store");
      return next;
    }
  }
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/", "/categories/:path*", "/products/:path*", "/orders/:path*"] };

