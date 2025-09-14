import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,  // ✅ skip ESLint errors in build
  },

  typescript: {
    ignoreBuildErrors: true,   // ✅ skip TypeScript errors in build
  },
};

export default nextConfig;
