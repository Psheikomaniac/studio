/**
 * Integration Test Setup Configuration
 * Configures Firebase Emulator connection for integration tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  terminate,
  clearIndexedDbPersistence,
  type Firestore,
} from 'firebase/firestore';

// Firebase Emulator configuration
const EMULATOR_CONFIG = {
  projectId: 'demo-balanceup-test',
  apiKey: 'fake-api-key',
  authDomain: 'demo-balanceup-test.firebaseapp.com',
  storageBucket: 'demo-balanceup-test.appspot.com',
};

const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;

let firebaseApp: FirebaseApp | null = null;
let firestore: Firestore | null = null;

/**
 * Initialize Firebase app connected to emulator
 * @returns Firebase app instance
 */
export function initializeTestApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Delete existing apps
  const existingApps = getApps();
  existingApps.forEach(app => {
    deleteApp(app).catch(() => {});
  });

  // Initialize new app
  firebaseApp = initializeApp(EMULATOR_CONFIG);
  firestore = getFirestore(firebaseApp);

  // Connect to emulator
  try {
    connectFirestoreEmulator(firestore, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    console.log(`Connected to Firestore Emulator at ${FIRESTORE_EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`);
  } catch (error) {
    console.warn('Firestore Emulator already connected or failed to connect:', error);
  }

  return firebaseApp;
}

/**
 * Get Firestore instance for tests
 * @returns Firestore instance
 */
export function getTestFirestore(): Firestore {
  if (!firestore) {
    initializeTestApp();
  }
  return firestore!;
}

/**
 * Cleanup all Firebase resources
 */
export async function cleanupFirebase() {
  if (firestore) {
    try {
      await terminate(firestore);
    } catch (error) {
      console.warn('Failed to terminate Firestore:', error);
    }
  }

  if (firebaseApp) {
    try {
      await deleteApp(firebaseApp);
    } catch (error) {
      console.warn('Failed to delete Firebase app:', error);
    }
  }

  firestore = null;
  firebaseApp = null;
}

// Global test hooks for integration tests
beforeAll(async () => {
  console.log('Setting up integration test environment...');
  initializeTestApp();
});

afterEach(async () => {
  // Note: We don't clear data between tests to allow inspection
  // Individual tests should clean up their own data if needed
});

afterAll(async () => {
  console.log('Cleaning up integration test environment...');
  await cleanupFirebase();
});
