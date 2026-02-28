'use client';

/**
 * Global Error Boundary Component
 * 
 * Catches unhandled errors in the component tree and displays a fallback UI.
 * Automatically reports errors to Sentry for monitoring.
 * 
 * Usage:
 * Wrap your app or specific sections in ErrorBoundary:
 * 
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Error is automatically captured by Sentry via instrumentation.ts
    // But we log it here too for development visibility
    console.error('ErrorBoundary caught:', error);
    
    // Optional: Additional error tracking/logging
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          errorBoundary: 'global',
        },
        contexts: {
          react: {
            componentStack: error.stack,
          },
        },
      });
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Etwas ist schiefgelaufen
          </h1>
          <p className="text-muted-foreground">
            Ein unerwarteter Fehler ist aufgetreten. Wir wurden automatisch benachrichtigt und kümmern uns darum.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 text-left">
            <p className="font-mono text-xs text-red-800 dark:text-red-200 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            variant="default"
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Zur Startseite
          </Button>
        </div>

        {process.env.NODE_ENV === 'production' && error.digest && (
          <p className="text-xs text-muted-foreground">
            Fehler-ID: {error.digest}
            <br />
            Bitte notiere diese ID, falls du den Support kontaktierst.
          </p>
        )}
      </div>
    </div>
  );
}
