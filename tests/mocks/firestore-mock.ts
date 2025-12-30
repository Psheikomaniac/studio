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
// Store documents by their full path (e.g., 'users/123', 'users/123/payments/abc')
const mockDocuments = new Map<string, any>();

// Basic pub/sub for realtime listeners
type Listener = (snapshot: any) => void;
interface QueryDescriptor {
  type: 'query';
  collectionPath: string;
  constraints?: any[];
}
// Maintain listeners per collection path; each entry stores the original query/ref and callback
interface ListenerEntry { qOrRef: any; cb: Listener }
const listenersByCollection = new Map<string, Set<ListenerEntry>>();

function getCollectionPathFromQueryOrRef(qOrRef: any): string {
  if (qOrRef?.type === 'query') return qOrRef.collectionPath;
  if (qOrRef?.type === 'collection') return qOrRef.path;
  if (qOrRef?.type === 'collectionGroup') return qOrRef.collectionId ?? qOrRef.path;
  return '';
}

function emitToCollectionPath(collectionPath: string) {
  const set = listenersByCollection.get(collectionPath);
  if (!set || set.size === 0) return;
  // For each listener on this collection, rebuild the snapshot for its specific query
  set.forEach(({ qOrRef, cb }) => {
    try {
      cb(buildQuerySnapshot(qOrRef));
    } catch {}
  });
}

function buildQuerySnapshot(qOrRef: any) {
  // Reuse getDocs filtering logic to create a consistent snapshot
  const { snapshots } = collectDocs(qOrRef);
  return createMockQuerySnapshot(snapshots);
}

function collectDocs(qOrRef: any) {
  let collectionPath: string | null = null;
  let constraints: any[] = [];

  if (qOrRef && qOrRef.type === 'collection' && qOrRef.path) {
    collectionPath = qOrRef.path;
  } else if (qOrRef && qOrRef.type === 'query' && qOrRef.collectionPath) {
    collectionPath = qOrRef.collectionPath;
    constraints = qOrRef.constraints || [];
  } else if (qOrRef && qOrRef.type === 'collectionGroup') {
    collectionPath = qOrRef.collectionId ?? qOrRef.path;
    constraints = qOrRef.constraints || [];
  }

  const snapshots: DocumentSnapshot[] = [];

  mockDocuments.forEach((data, fullPath) => {
    if (!collectionPath) return;

    let docRef: DocumentReference | null = null;

    if (qOrRef && qOrRef.type === 'collectionGroup') {
      // Match any document at .../{collectionId}/{docId}
      const parts = fullPath.split('/').filter(Boolean);
      const idx = parts.lastIndexOf(collectionPath);
      // Ensure the match refers to the collection segment and the docId is the final segment
      if (idx < 0 || idx + 1 >= parts.length) return;
      if (idx + 2 !== parts.length) return;

      const id = parts[idx + 1];
      const parentCollectionPath = parts.slice(0, idx + 1).join('/');
      docRef = createMockDocumentReference(parentCollectionPath, id);
    } else {
      if (!fullPath.startsWith(collectionPath + '/')) return;
      // Ensure this is a direct child document (one extra segment)
      const relative = fullPath.slice(collectionPath.length + 1);
      if (relative.includes('/')) return; // nested deeper

      const id = relative;
      docRef = createMockDocumentReference(collectionPath!, id);
    }

    if (!docRef) return;
    // Apply where constraints (minimal support)
    let passes = true;
    for (const c of constraints) {
      if (c?.type === 'where') {
        const { field, operator, value } = c;
        const fieldValue = (data ?? {})[field];
        if (operator === '==') {
          if (fieldValue !== value) {
            passes = false;
            break;
          }
        } else if (operator === '>=') {
          if (!(fieldValue >= value)) {
            passes = false;
            break;
          }
        } else if (operator === '<=') {
          if (!(fieldValue <= value)) {
            passes = false;
            break;
          }
        } else if (operator === '>') {
          if (!(fieldValue > value)) {
            passes = false;
            break;
          }
        } else if (operator === '<') {
          if (!(fieldValue < value)) {
            passes = false;
            break;
          }
        } else {
          // Unsupported operator in this mock
          passes = false;
          break;
        }
      }
    }
    if (!passes) return;

    snapshots.push(createMockDocumentSnapshot(docRef, data));
  });

  // Apply orderBy (single field support) and limit
  const order = constraints.find(c => c?.type === 'orderBy');
  if (order) {
    const { field, direction } = order;
    snapshots.sort((a: any, b: any) => {
      const av = a.data()?.[field];
      const bv = b.data()?.[field];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return direction === 'desc' ? -cmp : cmp;
    });
  }

  const limitConstraint = constraints.find(c => c?.type === 'limit');
  const finalSnapshots = limitConstraint ? snapshots.slice(0, limitConstraint.count) : snapshots;

  return { snapshots: finalSnapshots };
}

/**
 * Configuration for mock behavior
 */
type MockConfig = {
  /** When true, updateDoc behaves as upsert; when false, it throws if doc missing */
  upsertOnUpdate: boolean;
  /** When true, deleteDoc throws if doc missing */
  requireExistForDelete: boolean;
};

let mockConfig: MockConfig = {
  upsertOnUpdate: true,
  requireExistForDelete: false,
};

export function setMockConfig(config: Partial<MockConfig>) {
  mockConfig = { ...mockConfig, ...config };
}

/**
 * Creates a mock DocumentSnapshot
 */
export function createMockDocumentSnapshot<T = DocumentData>(
  refOrId: DocumentReference | string,
  data: T | null
): DocumentSnapshot {
  const ref = typeof refOrId === 'string'
    ? createMockDocumentReference('unknown', refOrId)
    : refOrId;
  return {
    id: (ref as any).id,
    ref: ref as any,
    exists: () => data !== null && data !== undefined,
    data: () => data,
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
  items: Array<DocumentSnapshot<T> | (T & { id?: string })>
): QuerySnapshot<T> {
  const docs: DocumentSnapshot<T>[] = items.map((item: any, idx) => {
    // If it already looks like a DocumentSnapshot (has exists/data/id functions), keep it
    if (item && typeof item.exists === 'function' && typeof item.data === 'function') {
      return item as DocumentSnapshot<T>;
    }
    // Otherwise, wrap plain data into a DocumentSnapshot with an id
    const id = item?.id || `doc_${idx}`;
    return createMockDocumentSnapshot(id, item as T);
  });

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: DocumentSnapshot<T>) => void) => {
      docs.forEach(callback);
    },
    metadata: {
      hasPendingWrites: false,
      fromCache: false,
      isEqual: vi.fn(),
    },
  } as unknown as QuerySnapshot<T>;
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
  collection: vi.fn((arg1: any, arg2?: any) => {
    // Overloads:
    // 1) collection(firestore, path)
    // 2) collection(docRef, subcollection)
    if (arg1 && typeof arg1 === 'object' && arg1.type === 'document') {
      const docRef = arg1 as ReturnType<typeof createMockDocumentReference>;
      const sub = String(arg2 || '');
      return createMockCollectionReference(`${docRef.path}/${sub}`);
    }
    // default: (firestore, path)
    return createMockCollectionReference(String(arg2 || arg1));
  }),

  collectionGroup: vi.fn((firestore: Firestore, collectionId: string) => {
    return {
      id: collectionId,
      path: collectionId,
      parent: null,
      firestore: firestore ?? createMockFirestore(),
      type: 'collectionGroup',
      withConverter: vi.fn(),
    } as unknown as any;
  }),

  doc: vi.fn((arg1: any, arg2?: any, ...pathSegments: string[]) => {
    // Overloads:
    // 1) doc(firestore, path, ...segments)
    // 2) doc(collectionRef)
    // 3) doc(collectionRef, customId)

    // If first arg is a CollectionReference from our mock
    if (arg1 && typeof arg1 === 'object' && arg1.type === 'collection') {
      const collectionRef = arg1 as ReturnType<typeof createMockCollectionReference>;
      const id = (typeof arg2 === 'string' && arg2) || `mock_${Math.random().toString(36).slice(2, 10)}`;
      return createMockDocumentReference(collectionRef.path, id);
    }

    // Fallback: treat as (firestore, path, ...segments)
    const path: string = String(arg2 || '');
    const fullPath = [path, ...pathSegments].filter(Boolean).join('/');
    const id = pathSegments[pathSegments.length - 1] || 'mock-id';
    const collectionPath = fullPath.substring(0, fullPath.length - id.length - 1) || path;
    return createMockDocumentReference(collectionPath, id);
  }),

  getDoc: vi.fn(async (docRef: DocumentReference) => {
    const data = mockDocuments.get(docRef.path) ?? null;
    return createMockDocumentSnapshot(docRef, data);
  }),

  getDocs: vi.fn(async (qOrRef: any) => {
    const { snapshots } = collectDocs(qOrRef);
    return createMockQuerySnapshot(snapshots);
  }),

  setDoc: vi.fn(async (docRef: DocumentReference, data: any) => {
    mockDocuments.set(docRef.path, data);
    // Emit to listeners on parent collection
    emitToCollectionPath(docRef.path.split('/').slice(0, -1).join('/'));
    return Promise.resolve();
  }),

  updateDoc: vi.fn(async (docRef: DocumentReference, data: any) => {
    // Conditional behavior based on config
    const exists = mockDocuments.has(docRef.path);
    if (!exists && !mockConfig.upsertOnUpdate) {
      throw new Error('Document not found');
    }
    const existing = exists ? mockDocuments.get(docRef.path) : {};
    
    const newData = { ...existing };
    Object.entries(data).forEach(([k, v]: [string, any]) => {
        if (v && typeof v === 'object' && v.__op === 'increment') {
            newData[k] = (existing[k] || 0) + v.value;
        } else {
            newData[k] = v;
        }
    });
    
    mockDocuments.set(docRef.path, newData);
    emitToCollectionPath(docRef.path.split('/').slice(0, -1).join('/'));
    return Promise.resolve();
  }),

  deleteDoc: vi.fn(async (docRef: DocumentReference) => {
    const exists = mockDocuments.has(docRef.path);
    if (!exists && mockConfig.requireExistForDelete) {
      throw new Error('Document not found');
    }
    const deleted = mockDocuments.delete(docRef.path);
    if (deleted) {
      emitToCollectionPath(docRef.path.split('/').slice(0, -1).join('/'));
    }
    return Promise.resolve();
  }),

  query: vi.fn((refOrQuery: any, ...args: any[]) => {
    // Determine base collection path
    const collectionPath = refOrQuery?.type === 'query'
      ? refOrQuery.collectionPath
      : refOrQuery?.path;
    const constraints = args.filter(Boolean);
    return {
      type: 'query',
      firestore: createMockFirestore(),
      converter: null,
      collectionPath,
      constraints,
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
    // Buffer operations to simulate atomicity
    const ops: Array<() => void> = [];
    const affectedCollections = new Set<string>();
    const transaction = {
      get: vi.fn(async (docRef: DocumentReference) => {
        const data = mockDocuments.get(docRef.path) ?? null;
        return createMockDocumentSnapshot(docRef, data);
      }),
      set: vi.fn((docRef: DocumentReference, data: any) => {
        ops.push(() => {
          mockDocuments.set(docRef.path, data);
          affectedCollections.add(docRef.path.split('/').slice(0, -1).join('/'));
        });
      }),
      update: vi.fn((docRef: DocumentReference, data: any) => {
        // In strict mode, require document to exist
        const exists = mockDocuments.has(docRef.path);
        if (!exists && !mockConfig.upsertOnUpdate) {
          throw new Error('Document not found');
        }
        ops.push(() => {
          const existing = exists ? mockDocuments.get(docRef.path) : {};
          const newData = { ...existing };
          Object.entries(data).forEach(([k, v]: [string, any]) => {
              if (v && typeof v === 'object' && v.__op === 'increment') {
                  newData[k] = (existing[k] || 0) + v.value;
              } else {
                  newData[k] = v;
              }
          });
          mockDocuments.set(docRef.path, newData);
          affectedCollections.add(docRef.path.split('/').slice(0, -1).join('/'));
        });
      }),
      delete: vi.fn((docRef: DocumentReference) => {
        const exists = mockDocuments.has(docRef.path);
        if (!exists && mockConfig.requireExistForDelete) {
          throw new Error('Document not found');
        }
        ops.push(() => {
          mockDocuments.delete(docRef.path);
          affectedCollections.add(docRef.path.split('/').slice(0, -1).join('/'));
        });
      }),
    };
    try {
      const result = await updateFunction(transaction);
      // Commit ops
      ops.forEach(fn => fn());
      // Emit snapshots
      affectedCollections.forEach(col => emitToCollectionPath(col));
      return result;
    } catch (e) {
      // Rollback: do nothing
      throw e;
    }
  }),

  writeBatch: vi.fn((firestore: Firestore) => {
    const ops: Array<() => void> = [];
    const affectedCollections = new Set<string>();
    return {
      set: vi.fn((docRef: DocumentReference, data: any) => {
        ops.push(() => {
          mockDocuments.set(docRef.path, data);
          affectedCollections.add(docRef.path.split('/').slice(0, -1).join('/'));
        });
      }),
      update: vi.fn((docRef: DocumentReference, data: any) => {
        const exists = mockDocuments.has(docRef.path);
        if (!exists && !mockConfig.upsertOnUpdate) {
          throw new Error('Document not found');
        }
        ops.push(() => {
          const existing = exists ? mockDocuments.get(docRef.path) : {};
          const newData = { ...existing };
          Object.entries(data).forEach(([k, v]: [string, any]) => {
              if (v && typeof v === 'object' && v.__op === 'increment') {
                  newData[k] = (existing[k] || 0) + v.value;
              } else {
                  newData[k] = v;
              }
          });
          mockDocuments.set(docRef.path, newData);
          affectedCollections.add(docRef.path.split('/').slice(0, -1).join('/'));
        });
      }),
      delete: vi.fn((docRef: DocumentReference) => {
        const exists = mockDocuments.has(docRef.path);
        if (!exists && mockConfig.requireExistForDelete) {
          throw new Error('Document not found');
        }
        ops.push(() => {
          mockDocuments.delete(docRef.path);
          affectedCollections.add(docRef.path.split('/').slice(0, -1).join('/'));
        });
      }),
      commit: vi.fn(async () => {
        ops.forEach(fn => fn());
        affectedCollections.forEach(col => emitToCollectionPath(col));
        return Promise.resolve();
      }),
    };
  }),

  onSnapshot: vi.fn((qOrRef: any, callback: any, errorCallback?: any) => {
    // Validate simple orderBy on non-existent field to trigger error
    const constraints = qOrRef?.constraints || [];
    const invalidOrder = constraints.find((c: any) => c?.type === 'orderBy' && typeof c.field === 'string' && c.field === 'nonExistentField');
    if (invalidOrder && typeof errorCallback === 'function') {
      setTimeout(() => errorCallback(new Error('Invalid orderBy field')), 0);
      return vi.fn();
    }

    const collectionPath = getCollectionPathFromQueryOrRef(qOrRef);
    if (!listenersByCollection.has(collectionPath)) listenersByCollection.set(collectionPath, new Set());
    const set = listenersByCollection.get(collectionPath)!;
    const entry: ListenerEntry = { qOrRef, cb: callback };
    set.add(entry);

    // Fire initial snapshot asynchronously
    setTimeout(() => {
      try {
        callback(buildQuerySnapshot(qOrRef));
      } catch {}
    }, 0);

    // Return unsubscribe
    return vi.fn(() => {
      const s = listenersByCollection.get(collectionPath);
      if (s) {
        // Find and remove matching entry
        [...s].forEach(item => {
          if (item.cb === callback) s.delete(item);
        });
        if (s.size === 0) listenersByCollection.delete(collectionPath);
      }
    });
  }),

  serverTimestamp: vi.fn(() => new Date().toISOString()),
  increment: vi.fn((val) => ({ __op: 'increment', value: val })),
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
