'use client';

import { firebaseConfig, enablePersistence as shouldEnablePersistence } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getPerformance } from 'firebase/performance';
import { getAnalytics, isSupported } from 'firebase/analytics';

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
 * Enables Firestore offline persistence with IndexedDB
 * Attempts multi-tab persistence first, falls back to single-tab if needed
 * @param firestore - Firestore instance to enable persistence on
 */
async function enableFirestorePersistence(firestore: ReturnType<typeof getFirestore>) {
  if (!shouldEnablePersistence || !isBrowserCompatible()) {
    return;
  }

  try {
    // Try to enable multi-tab persistence first
    await enableMultiTabIndexedDbPersistence(firestore);
    console.info('Firestore: Multi-tab persistence enabled');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn(
        'Firestore: Failed to enable persistence - multiple tabs open. ' +
        'Persistence is only enabled in the first tab.'
      );

      // Try single-tab persistence as fallback
      try {
        await enableIndexedDbPersistence(firestore, {
          forceOwnership: false
        });
        console.info('Firestore: Single-tab persistence enabled');
      } catch (singleTabErr: any) {
        console.warn('Firestore: Failed to enable single-tab persistence', singleTabErr);
      }
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn(
        'Firestore: Persistence is not supported in this browser. ' +
        'Data will not be cached offline.'
      );
    } else {
      // Unexpected error
      console.error('Firestore: Failed to enable persistence', err);
    }
  }
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
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  // Enable persistence asynchronously (non-blocking)
  enableFirestorePersistence(firestore).catch(err => {
    console.error('Failed to initialize Firestore persistence', err);
  });

  // Initialize monitoring services asynchronously (non-blocking)
  initializePerformanceMonitoring(firebaseApp);
  initializeAnalytics(firebaseApp).catch(err => {
    console.error('Failed to initialize Analytics', err);
  });

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';