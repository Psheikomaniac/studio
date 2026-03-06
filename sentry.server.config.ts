/**
 * Sentry Server-Side Configuration
 * 
 * This configures error tracking for Next.js server-side code (API routes, SSR, etc.)
 */

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

    // Server-side integrations
    integrations: [
      // No BrowserTracing on server
    ],

    // Ignore specific errors
    ignoreErrors: [
      // Firebase admin errors that are expected
      'auth/id-token-expired',
      'auth/argument-error',
    ],

    // Before sending event
    beforeSend(event, _hint) {
      // Don't send in development
      if (process.env.NODE_ENV === 'development' && process.env.SENTRY_ENABLED !== 'true') {
        console.log('[Sentry Server] Error captured (dev mode, not sent):', event);
        return null;
      }

      // Scrub sensitive data
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }

        // Scrub sensitive query params
        if (event.request.url) {
          event.request.url = event.request.url.replace(
            /([?&])(token|apikey|password|secret)=[^&]*/gi,
            '$1$2=REDACTED'
          );
        }
      }

      return event;
    },
  });
}
