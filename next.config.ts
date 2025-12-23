import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure turbopack
  turbopack: {},

  // Configure webpack to ignore the external folder
  webpack: (config: any) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/Chinesename.club/**', '**/node_modules/**'],
    };
    return config;
  },
};

export default nextConfig;
