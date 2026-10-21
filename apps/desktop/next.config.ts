import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Only export static files in production build for Tauri frontendDist
  ...(isProd ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
