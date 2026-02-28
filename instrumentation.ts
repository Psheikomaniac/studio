/**
 * Next.js Instrumentation File
 * 
 * This file is automatically loaded by Next.js to initialize monitoring tools.
 * Sentry SDK is initialized here for both server and client-side error tracking.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Server-side instrumentation
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only initialize Sentry if DSN is configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs');
      
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        
        // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Environment
        environment: process.env.NODE_ENV || 'development',
        
        // Enable debug mode in development
        debug: process.env.NODE_ENV === 'development',
        
        // Capture errors from these environments
        enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',
        
        // Integrations
        integrations: [
          // Automatic error context
          new Sentry.Integrations.Http({ tracing: true }),
        ],
        
        // Ignore specific errors
        ignoreErrors: [
          // Browser extensions
          'top.GLOBALS',
          // Random plugins/extensions
          'originalCreateNotification',
          'canvas.contentDocument',
          'MyApp_RemoveAllHighlights',
          // Facebook blocked errors
          'fb_xd_fragment',
          // ISP injected ads
          'bmi_SafeAddOnload',
          'EBCallBackMessageReceived',
        ],
        
        // Before sending, scrub sensitive data
        beforeSend(event, hint) {
          // Don't send errors in development unless explicitly enabled
          if (process.env.NODE_ENV === 'development' && process.env.SENTRY_ENABLED !== 'true') {
            return null;
          }
          
          // Filter out non-error exceptions
          if (event.exception) {
            const error = hint.originalException;
            if (error && typeof error === 'object' && 'message' in error) {
              // Ignore specific error messages
              const message = (error as Error).message;
              if (message.includes('ResizeObserver loop')) {
                return null;
              }
            }
          }
          
          return event;
        },
      });
    }
  }
  
  // Client-side instrumentation
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation if needed
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs');
      
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        environment: process.env.NODE_ENV || 'development',
        enabled: process.env.NODE_ENV === 'production',
      });
    }
  }
}
