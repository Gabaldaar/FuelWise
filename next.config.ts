
import type {NextConfig} from 'next';
import withPWA from 'next-pwa';

const pwaConfig = {
  dest: 'public',
  register: true, // Ensure the SW is registered
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  sw: 'sw.js',
  customWorkerDir: 'worker',
  buildExcludes: [/app-build-manifest\.json$/, /middleware-manifest\.json$/],
};

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

const withPwaConfig = withPWA(pwaConfig);
export default withPwaConfig(nextConfig);
