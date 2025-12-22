import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure webpack to ignore the external folder
  webpack: (config: any) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/Chinesename.club/**', '**/node_modules/**'],
    };
    return config;
  },

  // Empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
