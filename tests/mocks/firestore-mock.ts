/**
 * Firestore Mock Implementation
 * Provides mock objects and functions for testing Firebase Firestore operations
 */

import { vi } from 'vitest';
import type {
  Firestore,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';

/**
 * Mock document data storage
 */
const mockDocuments = new Map<string, any>();

/**
 * Creates a mock DocumentSnapshot
 */
export function createMockDocumentSnapshot<T = DocumentData>(
  id: string,
  data: T | null,
  exists = true
): DocumentSnapshot {
  return {
    id,
    exists: () => exists,
    data: () => data,
    ref: {} as DocumentReference,
    metadata: {
      hasPendingWrites: false,
      fromCache: false,
      isEqual: vi.fn(),
    },
  } as unknown as DocumentSnapshot;
}

/**
 * Creates a mock QuerySnapshot
 */
export function createMockQuerySnapshot<T = DocumentData>(
  docs: Array<{ id: string; data: T }>
): QuerySnapshot {
  const mockDocs = docs.map(({ id, data }) =>
    createMockDocumentSnapshot(id, data, true)
  );

  return {
    docs: mockDocs,
    empty: mockDocs.length === 0,
    size: mockDocs.length,
    forEach: (callback: (doc: DocumentSnapshot) => void) => {
      mockDocs.forEach(callback);
    },
    metadata: {
      hasPendingWrites: false,
      fromCache: false,
      isEqual: vi.fn(),
    },
  } as unknown as QuerySnapshot;
}

/**
 * Creates a mock Firestore instance
 */
export function createMockFirestore(): Firestore {
  return {
    type: 'firestore',
    app: {} as any,
    toJSON: vi.fn(),
  } as unknown as Firestore;
}

/**
 * Creates a mock CollectionReference
 */
export function createMockCollectionReference(
  path: string
): CollectionReference {
  return {
    id: path.split('/').pop(),
    path,
    parent: null,
    firestore: createMockFirestore(),
    type: 'collection',
    withConverter: vi.fn(),
  } as unknown as CollectionReference;
}

/**
 * Creates a mock DocumentReference
 */
export function createMockDocumentReference(
  path: string,
  id: string
): DocumentReference {
  return {
    id,
    path: `${path}/${id}`,
    parent: createMockCollectionReference(path),
    firestore: createMockFirestore(),
    type: 'document',
    withConverter: vi.fn(),
  } as unknown as DocumentReference;
}

/**
 * Mock Firestore functions
 */
export const mockFirestoreFunctions = {
  collection: vi.fn((firestore: Firestore, path: string) =>
    createMockCollectionReference(path)
  ),

  doc: vi.fn((firestore: Firestore, path: string, ...pathSegments: string[]) => {
    const fullPath = [path, ...pathSegments].join('/');
    const id = pathSegments[pathSegments.length - 1] || 'mock-id';
    return createMockDocumentReference(fullPath, id);
  }),

  getDoc: vi.fn(async (docRef: DocumentReference) => {
    const data = mockDocuments.get(docRef.id);
    return createMockDocumentSnapshot(docRef.id, data, !!data);
  }),

  getDocs: vi.fn(async (query: any) => {
    const docs: Array<{ id: string; data: any }> = [];
    mockDocuments.forEach((data, id) => {
      docs.push({ id, data });
    });
    return createMockQuerySnapshot(docs);
  }),

  setDoc: vi.fn(async (docRef: DocumentReference, data: any) => {
    mockDocuments.set(docRef.id, data);
    return Promise.resolve();
  }),

  updateDoc: vi.fn(async (docRef: DocumentReference, data: any) => {
    const existing = mockDocuments.get(docRef.id) || {};
    mockDocuments.set(docRef.id, { ...existing, ...data });
    return Promise.resolve();
  }),

  deleteDoc: vi.fn(async (docRef: DocumentReference) => {
    mockDocuments.delete(docRef.id);
    return Promise.resolve();
  }),

  query: vi.fn((...args: any[]) => {
    return {
      type: 'query',
      firestore: createMockFirestore(),
      converter: null,
    };
  }),

  where: vi.fn((field: string, operator: string, value: any) => {
    return { type: 'where', field, operator, value };
  }),

  orderBy: vi.fn((field: string, direction?: 'asc' | 'desc') => {
    return { type: 'orderBy', field, direction };
  }),

  limit: vi.fn((count: number) => {
    return { type: 'limit', count };
  }),

  startAfter: vi.fn((cursor: any) => {
    return { type: 'startAfter', cursor };
  }),

  runTransaction: vi.fn(async (firestore: Firestore, updateFunction: any) => {
    const transaction = {
      get: vi.fn(async (docRef: DocumentReference) => {
        const data = mockDocuments.get(docRef.id);
        return createMockDocumentSnapshot(docRef.id, data, !!data);
      }),
      set: vi.fn((docRef: DocumentReference, data: any) => {
        mockDocuments.set(docRef.id, data);
      }),
      update: vi.fn((docRef: DocumentReference, data: any) => {
        const existing = mockDocuments.get(docRef.id) || {};
        mockDocuments.set(docRef.id, { ...existing, ...data });
      }),
      delete: vi.fn((docRef: DocumentReference) => {
        mockDocuments.delete(docRef.id);
      }),
    };
    return updateFunction(transaction);
  }),

  writeBatch: vi.fn((firestore: Firestore) => {
    return {
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(async () => Promise.resolve()),
    };
  }),

  onSnapshot: vi.fn((query: any, callback: any, errorCallback?: any) => {
    // Return unsubscribe function
    return vi.fn();
  }),

  serverTimestamp: vi.fn(() => new Date().toISOString()),
};

/**
 * Clears all mock documents (use in beforeEach)
 */
export function clearMockDocuments(): void {
  mockDocuments.clear();
}

/**
 * Sets a mock document for testing
 */
export function setMockDocument(id: string, data: any): void {
  mockDocuments.set(id, data);
}

/**
 * Gets a mock document for verification
 */
export function getMockDocument(id: string): any {
  return mockDocuments.get(id);
}

/**
 * Checks if a mock document exists
 */
export function mockDocumentExists(id: string): boolean {
  return mockDocuments.has(id);
}
