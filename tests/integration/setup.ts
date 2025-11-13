/**
 * Integration Test Setup Configuration
 * Connects to Firebase Emulator when available; otherwise falls back to in-memory mock.
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Types are imported as type-only to avoid early module evaluation
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';

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
let usingMock = false;
// Prefer mock unless explicitly requested to use emulator via env
const FORCE_EMULATOR = process.env.FIRESTORE_EMULATOR === 'true';

async function isEmulatorAvailable(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300);
  try {
    const res = await fetch(`http://${FIRESTORE_EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`, {
      method: 'GET',
      signal: controller.signal,
    });
    return !!res;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureFirebaseModules() {
  const available = FORCE_EMULATOR ? await isEmulatorAvailable() : false;
  if (!available) {
    // Fall back to Firestore mock when emulator isn't reachable
    usingMock = true;
    vi.mock('firebase/firestore', async () => {
      const mocks = await import('../mocks/firestore-mock.ts');
      return {
        getFirestore: vi.fn(() => mocks.createMockFirestore()),
        // Full API surface from our mock
        ...mocks.mockFirestoreFunctions,
        // No-op emulator/lifecycle functions
        connectFirestoreEmulator: vi.fn(),
        terminate: vi.fn(async () => Promise.resolve()),
        clearIndexedDbPersistence: vi.fn(async () => Promise.resolve()),
      } as any;
    });

    vi.mock('firebase/app', () => ({
      initializeApp: vi.fn(() => ({} as any)),
      getApps: vi.fn(() => [] as any[]),
      deleteApp: vi.fn(async () => Promise.resolve()),
      getApp: vi.fn(() => ({} as any)),
    }));

    console.warn('Firestore Emulator not available. Using in-memory Firestore mock for integration tests.');
  }

  const appMod = await import('firebase/app');
  const fsMod = await import('firebase/firestore');
  return { appMod, fsMod };
}

/**
 * Initialize Firebase app (emulator or mock)
 */
export async function initializeTestApp(): Promise<FirebaseApp> {
  if (firebaseApp) return firebaseApp;

  const { appMod, fsMod } = await ensureFirebaseModules();

  // Delete any existing apps to avoid residue across tests
  try {
    const existingApps = appMod.getApps();
    for (const app of existingApps) {
      // deleteApp may not exist in our mocked app; guard accordingly
      try { await (appMod as any).deleteApp?.(app); } catch {}
    }
  } catch {}

  firebaseApp = appMod.initializeApp(EMULATOR_CONFIG) as FirebaseApp;
  firestore = fsMod.getFirestore(firebaseApp) as Firestore;

  // If using the in-memory mock, enforce stricter semantics for integration tests
  // - Updates should fail when the document does not exist
  // - Deletes should fail when the document does not exist
  if (usingMock) {
    try {
      const { setMockConfig } = await import('../mocks/firestore-mock.ts');
      setMockConfig({ upsertOnUpdate: false, requireExistForDelete: true });
    } catch {}
  }

  // Connect to emulator when available (no-op in mock mode)
  try {
    if (!usingMock) {
      fsMod.connectFirestoreEmulator(
        firestore as any,
        FIRESTORE_EMULATOR_HOST,
        FIRESTORE_EMULATOR_PORT
      );
      console.log(`Connected to Firestore Emulator at ${FIRESTORE_EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`);
    }
  } catch (error) {
    console.warn('Firestore Emulator connection failed or already connected:', error);
  }

  return firebaseApp;
}

/**
 * Get Firestore instance for tests
 */
export function getTestFirestore(): Firestore {
  if (!firestore) {
    throw new Error('Firestore not initialized. initializeTestApp() must be awaited in setup before tests run.');
  }
  return firestore as Firestore;
}

/**
 * Cleanup all Firebase resources
 */
export async function cleanupFirebase() {
  try {
    const { fsMod, appMod }: any = await (async () => {
      const appMod = await import('firebase/app');
      const fsMod = await import('firebase/firestore');
      return { appMod, fsMod };
    })();

    if (firestore && fsMod?.terminate) {
      try { await fsMod.terminate(firestore as any); } catch (error) {
        console.warn('Failed to terminate Firestore:', error);
      }
    }

    if (firebaseApp && appMod?.deleteApp) {
      try { await appMod.deleteApp(firebaseApp as any); } catch (error) {
        console.warn('Failed to delete Firebase app:', error);
      }
    }
  } catch {}

  firestore = null as any;
  firebaseApp = null as any;
}

// Global test hooks for integration tests
beforeAll(async () => {
  console.log('Setting up integration test environment...');
  await initializeTestApp();
});

afterEach(async () => {
  // Note: We don't clear data between tests to allow inspection
  // Individual tests should clean up their own data if needed
});

afterAll(async () => {
  console.log('Cleaning up integration test environment...');
  await cleanupFirebase();
});
