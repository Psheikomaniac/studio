import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mockFirebaseApp = { __app: true } as any;
const mockAuth = { __auth: true } as any;
const mockFirestore = { __firestore: true } as any;

const connectAuthEmulatorMock = vi.fn();
const connectFirestoreEmulatorMock = vi.fn();

vi.mock('firebase/app', () => {
  return {
    initializeApp: vi.fn(() => mockFirebaseApp),
    getApps: vi.fn(() => []),
    getApp: vi.fn(() => mockFirebaseApp),
  };
});

vi.mock('firebase/auth', () => {
  return {
    getAuth: vi.fn(() => mockAuth),
    connectAuthEmulator: connectAuthEmulatorMock,
  };
});

vi.mock('firebase/firestore', () => {
  return {
    initializeFirestore: vi.fn(() => mockFirestore),
    getFirestore: vi.fn(() => mockFirestore),
    connectFirestoreEmulator: connectFirestoreEmulatorMock,
    persistentLocalCache: vi.fn(() => ({ __cache: 'persistent' })),
    persistentMultipleTabManager: vi.fn(() => ({ __tab: true })),
    memoryLocalCache: vi.fn(() => ({ __cache: 'memory' })),
    CACHE_SIZE_UNLIMITED: -1,
  };
});

vi.mock('firebase/performance', () => {
  return {
    getPerformance: vi.fn(() => ({ __perf: true })),
  };
});

vi.mock('firebase/analytics', () => {
  return {
    getAnalytics: vi.fn(() => ({ __analytics: true })),
    isSupported: vi.fn(async () => false),
  };
});

describe('Firebase emulator connection (client init)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUseFirebase = process.env.NEXT_PUBLIC_USE_FIREBASE;
  const originalUseEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS;
  const originalFsHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  const originalAuthHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).__BALANCEUP_FIREBASE_SDKS__;
    delete (globalThis as any).__BALANCEUP_FIREBASE_EMULATORS_CONNECTED__;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_USE_FIREBASE = originalUseFirebase;
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = originalUseEmulators;
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = originalFsHost;
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = originalAuthHost;
  });

  it('connects to Firestore/Auth emulators in development when enabled', async () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = 'true';
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

    // Ensure local hostname for default heuristics (even though we force-enable via env)
    try {
      window.location.href = 'http://localhost/';
    } catch {
      // ignore
    }

    const { initializeFirebase } = await import('@/firebase/index');
    const sdks = initializeFirebase();

    expect(sdks).toBeDefined();
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledWith(mockFirestore, '127.0.0.1', 8080);

    expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectAuthEmulatorMock).toHaveBeenCalledWith(
      mockAuth,
      'http://127.0.0.1:9099',
      expect.objectContaining({ disableWarnings: true })
    );
  });

  it('does not connect to emulators when explicitly disabled', async () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_USE_FIREBASE = 'true';
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = 'false';

    const { initializeFirebase } = await import('@/firebase/index');
    initializeFirebase();

    expect(connectFirestoreEmulatorMock).not.toHaveBeenCalled();
    expect(connectAuthEmulatorMock).not.toHaveBeenCalled();
  });
});
