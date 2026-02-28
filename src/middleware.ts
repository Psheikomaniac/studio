/**
 * Next.js Middleware with Rate Limiting
 * 
 * This middleware protects API routes from abuse by rate limiting requests.
 * Different endpoints have different limits based on their sensitivity.
 * 
 * Rate Limiting Strategy:
 * - Auth endpoints: Strict (5 req/15min) - prevent brute-force
 * - Admin endpoints: Strict (10 req/hour) - prevent abuse
 * - Regular API: Moderate (100 req/min) - normal usage
 * - Static files: No limit
 * 
 * Requirements:
 * - Upstash Redis account (free tier: 10,000 commands/day)
 * - Environment variables: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Get client IP address from request
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 */
function getClientIp(request: NextRequest): string {
  // Try Vercel's forwarded header first
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Try real IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to 'unknown' (should never happen in production)
  return 'unknown';
}

/**
 * Create rate limiters (lazy initialization)
 * Only creates Redis connection if rate limiting is enabled
 */
function createRateLimiters() {
  // Skip rate limiting if not configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Middleware] Rate limiting DISABLED: Upstash Redis not configured');
    return null;
  }

  const redis = Redis.fromEnv();

  return {
    // Strict: Auth endpoints (prevent brute-force login attacks)
    auth: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: '@balanceup/auth',
    }),

    // Strict: Admin endpoints (prevent abuse)
    admin: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
      prefix: '@balanceup/admin',
    }),

    // Moderate: Regular API (normal usage)
    api: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: '@balanceup/api',
    }),

    // Generous: Public endpoints (team browsing, etc.)
    public: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, '1 m'),
      analytics: true,
      prefix: '@balanceup/public',
    }),
  };
}

// Lazy initialization of rate limiters
let rateLimiters: ReturnType<typeof createRateLimiters> | null | undefined;

/**
 * Middleware function
 * Runs on every request to /api/* routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip rate limiting for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Initialize rate limiters on first request
  if (rateLimiters === undefined) {
    rateLimiters = createRateLimiters();
  }

  // If rate limiting is not configured, allow all requests
  if (!rateLimiters) {
    return NextResponse.next();
  }

  // Get client IP
  const ip = getClientIp(request);

  // Select appropriate rate limiter based on path
  let ratelimiter: Ratelimit;
  if (pathname.startsWith('/api/auth/')) {
    ratelimiter = rateLimiters.auth;
  } else if (pathname.startsWith('/api/admin/')) {
    ratelimiter = rateLimiters.admin;
  } else if (pathname.match(/\/api\/(teams|clubs)\/browse/)) {
    ratelimiter = rateLimiters.public;
  } else {
    ratelimiter = rateLimiters.api;
  }

  // Check rate limit
  const { success, limit, reset, remaining } = await ratelimiter.limit(ip);

  // Add rate limit headers to response
  const response = success
    ? NextResponse.next()
    : new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        },
      });

  // Add rate limit info to headers (useful for debugging)
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());

  // If rate limited, add Retry-After header
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    response.headers.set('Retry-After', retryAfter.toString());

    // Log rate limit violations in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[Rate Limit] IP ${ip} exceeded limit on ${pathname}`);
    }

    // Return JSON error
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  return response;
}

/**
 * Matcher configuration
 * Only run middleware on API routes
 */
export const config = {
  matcher: '/api/:path*',
};
