/**
 * Firebase App Check Configuration
 * 
 * App Check protects your backend resources from abuse by preventing unauthorized clients
 * from accessing your backend resources. It works with reCAPTCHA v3 to verify requests
 * are coming from your legitimate app.
 * 
 * Setup Required:
 * 1. Enable App Check in Firebase Console
 * 2. Register your app with reCAPTCHA v3 (https://www.google.com/recaptcha/admin)
 * 3. Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to your environment variables
 * 4. For local development, generate a debug token:
 *    `firebase appcheck:debug --project your-project-id`
 */

'use client';

import { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';

/**
 * Checks if App Check should be initialized
 * @returns true if App Check is enabled and required config is present
 */
function shouldInitializeAppCheck(): boolean {
  // Skip if no reCAPTCHA site key is configured
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey || siteKey.trim().length === 0) {
    console.info('Firebase App Check: Skipped (NEXT_PUBLIC_RECAPTCHA_SITE_KEY not configured)');
    return false;
  }

  // Skip in test environment
  if (process.env.NODE_ENV === 'test') {
    console.info('Firebase App Check: Skipped (test environment)');
    return false;
  }

  return true;
}

/**
 * Initializes Firebase App Check with reCAPTCHA v3
 * 
 * @param firebaseApp - The initialized Firebase app instance
 * @returns AppCheck instance or null if initialization was skipped
 * 
 * @example
 * ```typescript
 * const firebaseApp = initializeApp(config);
 * initializeFirebaseAppCheck(firebaseApp);
 * ```
 */
export function initializeFirebaseAppCheck(firebaseApp: FirebaseApp): AppCheck | null {
  if (!shouldInitializeAppCheck()) {
    return null;
  }

  try {
    // Prevent multiple initializations
    const globalAny = globalThis as any;
    if (globalAny.__BALANCEUP_APP_CHECK_INITIALIZED__) {
      console.info('Firebase App Check: Already initialized');
      return globalAny.__BALANCEUP_APP_CHECK_INSTANCE__;
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
    const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;

    // In development with debug token, enable debug mode
    if (process.env.NODE_ENV === 'development' && debugToken) {
      (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
      console.info('Firebase App Check: Debug mode enabled (development)');
    }

    const appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      
      // Auto-refresh tokens to prevent expiration
      isTokenAutoRefreshEnabled: true,
    });

    globalAny.__BALANCEUP_APP_CHECK_INITIALIZED__ = true;
    globalAny.__BALANCEUP_APP_CHECK_INSTANCE__ = appCheck;

    console.info('Firebase App Check: Initialized successfully with reCAPTCHA v3');
    return appCheck;

  } catch (error) {
    console.error('Firebase App Check: Initialization failed', error);
    
    // In development, log helpful debugging information
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'App Check troubleshooting:\n' +
        '1. Verify NEXT_PUBLIC_RECAPTCHA_SITE_KEY is correct\n' +
        '2. Check reCAPTCHA v3 is configured at https://www.google.com/recaptcha/admin\n' +
        '3. Ensure domain is whitelisted in reCAPTCHA settings\n' +
        '4. For local development, use NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN\n' +
        '   Generate with: firebase appcheck:debug'
      );
    }
    
    return null;
  }
}

/**
 * Gets the App Check instance
 * @returns AppCheck instance or null if not initialized
 */
export function getAppCheckInstance(): AppCheck | null {
  const globalAny = globalThis as any;
  return globalAny.__BALANCEUP_APP_CHECK_INSTANCE__ ?? null;
}
