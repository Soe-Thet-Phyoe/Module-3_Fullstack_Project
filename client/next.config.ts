import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.CART_BROWSER_TEST === "1" && {
    distDir: `.next/cart-browser${process.env.CART_TEST_WEB_PORT ? "-" + Number(process.env.CART_TEST_WEB_PORT) : ""}`,
  }),
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const djangoApiBaseUrl = (process.env.DJANGO_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
    return [
      { source: "/api/orders", destination: `${djangoApiBaseUrl}/api/orders/` },
      { source: "/api/orders/buy-now", destination: `${djangoApiBaseUrl}/api/orders/buy-now/` },
      { source: "/api/cart", destination: `${djangoApiBaseUrl}/api/cart/` },
      { source: "/api/cart/:path*", destination: `${djangoApiBaseUrl}/api/cart/:path*/` },
      {
        source: "/api/auth/:path*",
        destination: `${djangoApiBaseUrl}/api/auth/:path*/`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
