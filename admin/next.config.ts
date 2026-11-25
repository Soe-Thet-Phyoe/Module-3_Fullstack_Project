import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DASHBOARD_BROWSER_TEST === "1" && { distDir: ".next/dashboard-browser" }),
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
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
