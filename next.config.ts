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
  
  // Security Headers (Issue #7)
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allow scripts from self, Firebase, and inline (for Next.js)
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com",
              // Styles from self and inline (for Tailwind)
              "style-src 'self' 'unsafe-inline'",
              // Images from self, data URIs, and whitelisted domains
              "img-src 'self' blob: data: https://placehold.co https://images.unsplash.com https://picsum.photos https://ui-avatars.com https://firebasestorage.googleapis.com",
              // Fonts from self
              "font-src 'self' data:",
              // Connect to Firebase, Sentry, and self
              "connect-src 'self' https://*.firebaseio.com https://*.cloudfunctions.net https://firestore.googleapis.com https://*.googleapis.com https://*.sentry.io wss://*.firebaseio.com",
              // Frame ancestors (prevent clickjacking)
              "frame-ancestors 'none'",
              // No objects (Flash, Java applets, etc.)
              "object-src 'none'",
              // Base URI
              "base-uri 'self'",
              // Form actions
              "form-action 'self'",
              // Upgrade insecure requests
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // XSS Protection (legacy, but still useful)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Permissions Policy (restrict browser features)
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=(self)',
              'interest-cohort=()',
            ].join(', '),
          },
          // Strict Transport Security (HTTPS only)
          // Only in production, not in development
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
} satisfies NextConfig;

export default withBundleAnalyzer(nextConfig);
