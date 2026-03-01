/**
 * Next.js Middleware with Rate Limiting & CORS
 * 
 * This middleware protects API routes from abuse and handles CORS.
 * Different endpoints have different limits based on their sensitivity.
 * 
 * Features:
 * - Rate limiting (auth/admin/api endpoints)
 * - CORS headers for API routes
 * - Security headers (via next.config.ts)
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
 * Allowed origins for CORS
 * Add production domains here
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:9002',
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean) as string[];

/**
 * Handle CORS for API routes
 */
function handleCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');
  
  // Check if origin is allowed
  if (origin && (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === 'development')) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Set CORS headers for all API routes
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token'
  );
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

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
 * Handles CORS, rate limiting, and preflight requests
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle CORS preflight (OPTIONS requests)
  if (request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    return handleCors(request, preflightResponse);
  }

  // Initialize rate limiters on first request
  if (rateLimiters === undefined) {
    rateLimiters = createRateLimiters();
  }

  // If rate limiting is not configured, allow all requests (with CORS)
  if (!rateLimiters) {
    const response = NextResponse.next();
    return handleCors(request, response);
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

  // Create response (success or rate limited)
  let response: NextResponse;
  
  if (success) {
    response = NextResponse.next();
  } else {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    
    // Log rate limit violations in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[Rate Limit] IP ${ip} exceeded limit on ${pathname}`);
    }

    // Return JSON error
    response = new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());

  // Add CORS headers
  return handleCors(request, response);
}

/**
 * Matcher configuration
 * Only run middleware on API routes
 */
export const config = {
  matcher: '/api/:path*',
};
