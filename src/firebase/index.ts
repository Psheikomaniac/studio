'use client';

import { firebaseConfig, enablePersistence as shouldEnablePersistence } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import { getPerformance } from 'firebase/performance';
import { getAnalytics, isSupported } from 'firebase/analytics';

function parseHostPort(
  value: string | undefined,
  defaults: { host: string; port: number }
): { host: string; port: number } {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return defaults;

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const withoutProtocol = hasProtocol ? trimmed.replace(/^https?:\/\//i, '') : trimmed;
  const [hostPart, portPart] = withoutProtocol.split(':');
  const host = (hostPart ?? '').trim() || defaults.host;
  const port = portPart ? Number(portPart) : defaults.port;
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : defaults.port,
  };
}

function shouldUseFirebaseEmulators(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV !== 'development') return false;
  if (process.env.NEXT_PUBLIC_USE_FIREBASE !== 'true') return false;

  const flag = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS;
  if (flag === 'false') return false;
  if (flag === 'true') return true;

  // Default: only auto-enable on local dev hosts.
  const hostname = window.location?.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function connectFirebaseEmulatorsOnce(params: {
  auth: ReturnType<typeof getAuth>;
  firestore: ReturnType<typeof getFirestore>;
}) {
  const globalAny = globalThis as any;
  if (globalAny.__BALANCEUP_FIREBASE_EMULATORS_CONNECTED__) return;
  if (!shouldUseFirebaseEmulators()) return;

  globalAny.__BALANCEUP_FIREBASE_EMULATORS_CONNECTED__ = true;

  const firestoreTarget = parseHostPort(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST, {
    host: '127.0.0.1',
    port: 8080,
  });

  const authTarget = parseHostPort(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST, {
    host: '127.0.0.1',
    port: 9099,
  });

  try {
    connectFirestoreEmulator(params.firestore as any, firestoreTarget.host, firestoreTarget.port);
  } catch (err) {
    console.warn('Firestore Emulator connection failed or already connected:', err);
  }

  try {
    connectAuthEmulator(params.auth, `http://${authTarget.host}:${authTarget.port}`, {
      disableWarnings: true,
    });
  } catch (err) {
    console.warn('Auth Emulator connection failed or already connected:', err);
  }

  console.info(
    `Firebase Emulators: Enabled (Firestore ${firestoreTarget.host}:${firestoreTarget.port}, Auth ${authTarget.host}:${authTarget.port})`
  );
}

/**
 * Checks if the current browser supports Firebase features
 * @returns true if browser is compatible with Firebase
 */
function isBrowserCompatible(): boolean {
  return typeof window !== 'undefined' &&
         typeof navigator !== 'undefined' &&
         'indexedDB' in window;
}

/**
 * Initializes Firebase Performance Monitoring
 * @param firebaseApp - Firebase app instance
 * @returns Performance instance or null if not supported
 */
function initializePerformanceMonitoring(firebaseApp: FirebaseApp) {
  try {
    if (!isBrowserCompatible()) {
      return null;
    }

    // Only enable Performance Monitoring in production or when explicitly enabled
    // This prevents quota/CORS errors in development
    const enablePerformance = process.env.NODE_ENV === 'production' ||
                              process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE === 'true';

    if (!enablePerformance) {
      console.info('Firebase Performance Monitoring: Disabled in development');
      return null;
    }

    const perf = getPerformance(firebaseApp);
    console.info('Firebase Performance Monitoring initialized');
    return perf;
  } catch (err) {
    console.warn('Firebase Performance Monitoring could not be initialized', err);
    return null;
  }
}

/**
 * Initializes Firebase Analytics
 * @param firebaseApp - Firebase app instance
 * @returns Analytics instance or null if not supported
 */
async function initializeAnalytics(firebaseApp: FirebaseApp) {
  try {
    if (!isBrowserCompatible()) {
      return null;
    }

    // Skip analytics if measurement ID is not configured or is a placeholder
    const measurementId = firebaseConfig.measurementId;
    if (!measurementId || measurementId === 'G-XXXXXXXXXX' || measurementId.length === 0) {
      console.info('Firebase Analytics: Measurement ID not configured, skipping initialization');
      return null;
    }

    const supported = await isSupported();
    if (supported) {
      const analytics = getAnalytics(firebaseApp);
      console.info('Firebase Analytics initialized');
      return analytics;
    } else {
      console.warn('Firebase Analytics is not supported in this environment');
      return null;
    }
  } catch (err) {
    console.warn('Firebase Analytics could not be initialized', err);
    return null;
  }
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Ensure stable singleton instances across Next.js Fast Refresh / HMR.
  // Re-initializing Firestore with different settings can lead to subtle runtime issues,
  // especially in Safari.
  const globalAny = globalThis as any;
  const existing = globalAny.__BALANCEUP_FIREBASE_SDKS__ as
    | { firebaseApp: FirebaseApp; auth: ReturnType<typeof getAuth>; firestore: ReturnType<typeof getFirestore> }
    | undefined;
  if (existing?.firebaseApp) {
    return existing;
  }

  const auth = getAuth(firebaseApp);

  // Browser detection (best-effort)
  let isSafari = false;
  try {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua) && !/Edg\//.test(ua);
    }
  } catch {}

  // Decide on long-polling strategy
  const envForce = process.env.NEXT_PUBLIC_FIREBASE_FORCE_LONG_POLLING;
  let forceLongPolling: boolean;
  if (envForce === 'true') {
    forceLongPolling = true;
  } else if (envForce === 'false') {
    forceLongPolling = false;
  } else {
    // Default heuristics: force long polling only on Safari.
    // In other browsers we prefer WebChannel; auto-detect remains enabled.
    forceLongPolling = isSafari;
  }
  if (forceLongPolling) {
    console.info('Firestore networking: Using experimentalForceLongPolling (dev/safari fallback)');
  }

  // Initialize Firestore with modern cache API (persistence and network transport configured here)
  let firestore;
  // Safari is particularly sensitive to IndexedDB/persistence edge cases.
  // Prefer memory cache there for stability (persistence can be re-enabled via env if needed).
  const usePersistence = shouldEnablePersistence && isBrowserCompatible() && !isSafari;
  if (shouldEnablePersistence && isSafari) {
    console.info('Firestore persistence: Disabled on Safari for stability (using memory cache).');
  }
  // Note: experimentalAutoDetectLongPolling and experimentalForceLongPolling are mutually exclusive.
  // When forceLongPolling is true, auto-detect should not be enabled to avoid internal state conflicts.
  const options = usePersistence
    ? {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        ...(forceLongPolling
          ? { experimentalForceLongPolling: true }
          : { experimentalAutoDetectLongPolling: true })
      }
    : {
        localCache: memoryLocalCache(),
        ...(forceLongPolling
          ? { experimentalForceLongPolling: true }
          : { experimentalAutoDetectLongPolling: true })
      };

  try {
    firestore = initializeFirestore(firebaseApp, options);
    console.info(
      usePersistence
        ? 'Firestore: Multi-tab persistence enabled (modern API)'
        : 'Firestore: Memory-only cache enabled'
    );
  } catch {
    // If already initialized elsewhere, fall back to the existing instance
    firestore = getFirestore(firebaseApp);
  }

  // Connect to emulators (dev only, best-effort) before any reads/writes.
  connectFirebaseEmulatorsOnce({ auth, firestore });

  // Initialize monitoring services asynchronously (non-blocking)
  initializePerformanceMonitoring(firebaseApp);
  initializeAnalytics(firebaseApp).catch(err => {
    console.error('Failed to initialize Analytics', err);
  });

  const sdks = {
    firebaseApp,
    auth,
    firestore
  };

  globalAny.__BALANCEUP_FIREBASE_SDKS__ = sdks;
  return sdks;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';