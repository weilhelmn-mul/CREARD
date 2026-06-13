import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Force webpack for production builds — Turbopack has minification bugs
  // with very large components (>5000 lines) causing "Cannot access 'th' before initialization"
  experimental: { turbo: false },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  allowedDevOrigins: ["*"],
};

export default nextConfig;
