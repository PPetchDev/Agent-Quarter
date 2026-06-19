import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@squad/core'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default config;
