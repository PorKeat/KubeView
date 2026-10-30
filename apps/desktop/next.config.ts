import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const appPackage = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_KUBEVIEW_VERSION: appPackage.version,
  },
  // Only export static files in production build for Tauri frontendDist
  ...(isProd ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
