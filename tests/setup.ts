/**
 * Test Setup Configuration
 * Configures global test environment with mocks for Firebase and Next.js
 */

import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import '@testing-library/jest-dom';

// Determine whether we are running integration tests (use real Firebase emulator)
const IS_INTEGRATION = process.env.VITEST_INTEGRATION === 'true';

// Vereinheitlichter Firebase Mock auf Basis der dedizierten Mock-Implementierung
if (!IS_INTEGRATION) {
  vi.mock('firebase/firestore', async () => {
    // Dynamic import to play nice with Vitest hoisting
    const mocks = await import('./mocks/firestore-mock.ts');
    return {
      // Instanz-Funktionen
      getFirestore: vi.fn(() => mocks.createMockFirestore()),
      // Vollständige API aus der Mock-Implementierung (collection, doc, getDoc, ...)
      ...mocks.mockFirestoreFunctions,
      // Emulator-/Lifecycle-Funktionen, als No-Op für Tests
      connectFirestoreEmulator: vi.fn(),
      terminate: vi.fn(async () => Promise.resolve()),
      clearIndexedDbPersistence: vi.fn(async () => Promise.resolve()),
    };
  });

  vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(),
    getApps: vi.fn(() => []),
    getApp: vi.fn(),
  }));
}

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Global test hooks
beforeAll(() => {
  // Setup code before all tests
});

afterEach(() => {
  // Cleanup after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
  vi.resetAllMocks();
});
