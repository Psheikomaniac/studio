import type { NextConfig } from 'next';

// Lazily enable bundle analyzer only when requested and available.
let withBundleAnalyzer: (config: NextConfig) => NextConfig = (config) => config;
if (process.env.ANALYZE === 'true') {
  try {
     
    const analyzerFactory = require('@next/bundle-analyzer');
    const analyzer = analyzerFactory({ enabled: true });
    withBundleAnalyzer = analyzer;
  } catch {
    // Do not crash builds if the dependency is missing; just warn.
     
    console.warn('[PRD-10] @next/bundle-analyzer not installed. Run: npm i -D @next/bundle-analyzer');
  }
}

const nextConfig = {
  /* config options here */
  typescript: {
    // Enforce TypeScript errors to fail the build as required by PRD-08
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Increase timeout for slow image services
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
} satisfies NextConfig;

export default withBundleAnalyzer(nextConfig);
