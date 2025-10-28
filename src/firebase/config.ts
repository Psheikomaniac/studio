/**
 * Validates that required Firebase environment variables are present
 * @throws Error if required environment variables are missing
 */
function validateFirebaseConfig() {
  // Check actual config values instead of dynamic process.env lookup
  // This works correctly with Turbopack's compile-time inlining
  const config = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };

  const missing = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

// Only validate configuration in development when Firebase is enabled
// Run only server-side to avoid Turbopack bundling issues
if (typeof window === 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_USE_FIREBASE === 'true') {
  validateFirebaseConfig();
}

/**
 * Firebase configuration object loaded from environment variables
 * Fallback to empty strings in production to allow Firebase App Hosting auto-initialization
 */
export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
};

/**
 * Feature flag to enable/disable Firebase integration
 * @default false
 */
export const useFirebase = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

/**
 * Feature flag to enable/disable Firestore offline persistence
 * @default false
 */
export const enablePersistence = process.env.NEXT_PUBLIC_FIREBASE_PERSISTENCE === 'true';
