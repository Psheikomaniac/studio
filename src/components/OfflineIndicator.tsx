/**
 * Offline Indicator Component
 * 
 * Displays a banner when the app is offline.
 * Uses the navigator.onLine API to detect connectivity.
 * 
 * Features:
 * - Auto-detects online/offline status
 * - Shows user-friendly message
 * - Indicates when changes will sync
 * - Automatic dismissal when back online
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Handle online event
    const handleOnline = () => {
      setShowTransition(true);
      setIsOnline(true);
      
      // Hide transition message after 3 seconds
      setTimeout(() => {
        setShowTransition(false);
      }, 3000);
    };

    // Handle offline event
    const handleOffline = () => {
      setIsOnline(false);
      setShowTransition(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show anything when online (unless transitioning)
  if (isOnline && !showTransition) {
    return null;
  }

  // Show "back online" message briefly
  if (isOnline && showTransition) {
    return (
      <Alert 
        variant="default" 
        className="fixed bottom-4 left-4 right-4 z-50 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 md:left-auto md:right-4 md:w-96"
      >
        <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Wieder online!</strong> Änderungen werden jetzt synchronisiert.
        </AlertDescription>
      </Alert>
    );
  }

  // Show offline warning
  return (
    <Alert 
      variant="destructive" 
      className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
    >
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        <strong>Keine Internetverbindung</strong>
        <br />
        <span className="text-sm">
          Du siehst gespeicherte Daten. Änderungen werden synchronisiert, sobald du wieder online bist.
        </span>
      </AlertDescription>
    </Alert>
  );
}
