import type { NextConfig } from 'next';
// @ts-expect-error next-pwa types
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@school-syllabus/types'],
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

export default pwaConfig(nextConfig);
