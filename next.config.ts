import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No native modules / serverExternalPackages needed — storage is a
  // zero-dependency JSON store that works on Vercel serverless functions.
};

export default nextConfig;
