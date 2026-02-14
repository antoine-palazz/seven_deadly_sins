import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/seven_deadly_sins" : "",
  assetPrefix: isProd ? "/seven_deadly_sins/" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
