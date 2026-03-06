/**
 * Sentry Client-Side Configuration
 * 
 * This configures error tracking and performance monitoring for the browser.
 * Automatically captures unhandled exceptions and failed network requests.
 */

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session Replay (captures user interactions for debugging)
    // Careful: This records user sessions - be GDPR compliant!
    replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.0,
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Only send errors in production (unless explicitly enabled)
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

    tracePropagationTargets: ['localhost', /^\//, /^https:\/\/[^/]*\.vercel\.app/, /^https:\/\/[^/]*\.web\.app/],

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      
      // Firebase expected errors
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      
      // Network errors (often user connectivity issues)
      'NetworkError',
      'Failed to fetch',
    ],

    // Before sending event, scrub sensitive data
    beforeSend(event, _hint) {
      // Don't send in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && process.env.SENTRY_ENABLED !== 'true') {
        console.log('[Sentry] Error captured (dev mode, not sent):', event);
        return null;
      }

      // Scrub sensitive data from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/([?&])(token|apikey|password)=[^&]*/gi, '$1$2=REDACTED');
      }

      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(_breadcrumb => {
          if (_breadcrumb.data) {
            if (_breadcrumb.data.url) {
              _breadcrumb.data.url = _breadcrumb.data.url.replace(/([?&])(token|apikey|password)=[^&]*/gi, '$1$2=REDACTED');
            }
          }
          return _breadcrumb;
        });
      }

      return event;
    },
  });
}
