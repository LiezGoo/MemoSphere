import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep the dev server's files separate from `next build` output.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
