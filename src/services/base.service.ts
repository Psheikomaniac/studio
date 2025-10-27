/**
 * Base Firebase Service
 * Abstract class providing common CRUD operations for all Firebase services
 * 
 * @example
 * ```typescript
 * class PlayerService extends BaseFirebaseService<Player> {
 *   constructor(firestore: Firestore) {
 *     super(firestore, 'players');
 *   }
 * }
 * ```
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
  type QueryConstraint,
  type DocumentSnapshot,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import type {
  ServiceResult,
  QueryOptions,
  PaginatedResult,
  CreateOptions,
  UpdateOptions,
  DeleteOptions,
  BatchOperationResult,
  SubscriptionCallback,
  UnsubscribeFunction,
} from './types';

/**
 * Abstract base class for Firebase Firestore services
 * Provides common CRUD operations and utility methods
 * 
 * @template T The document type this service handles
 */
export abstract class BaseFirebaseService<T> {
  protected firestore: Firestore;
  protected collectionName: string;

  /**
   * Create a new service instance
   * @param firestore Firestore instance from Firebase
   * @param collectionName Name of the Firestore collection
   */
  constructor(firestore: Firestore, collectionName: string) {
    this.firestore = firestore;
    this.collectionName = collectionName;
  }

  /**
   * Get reference to the collection
   * @returns CollectionReference for this service's collection
   */
  protected getCollection(): CollectionReference {
    return collection(this.firestore, this.collectionName);
  }

  /**
   * Get reference to a specific document
   * @param id Document ID
   * @returns DocumentReference for the specified document
   */
  protected getDocRef(id: string): DocumentReference {
    return doc(this.firestore, this.collectionName, id);
  }

  /**
   * Generate current ISO timestamp
   * @returns ISO 8601 formatted timestamp string
   */
  protected timestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generate a unique ID for a new document
   * Uses Firestore's auto-generated ID
   * @returns Unique document ID
   */
  protected generateId(): string {
    return doc(this.getCollection()).id;
  }

  /**
   * Convert Firestore document snapshot to typed data
   * @param snapshot Document snapshot from Firestore
   * @returns Typed document data or null if doesn't exist
   */
  protected snapshotToData(snapshot: DocumentSnapshot): (T & { id: string }) | null {
    if (!snapshot.exists()) {
      return null;
    }
    return {
      ...snapshot.data() as T,
      id: snapshot.id,
    };
  }

  /**
   * Build Firestore query constraints from QueryOptions
   * @param options Query options
   * @returns Array of QueryConstraints
   */
  protected buildQueryConstraints(options: QueryOptions): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];

    // Add where clauses
    if (options.where) {
      options.where.forEach(w => {
        constraints.push(where(w.field, w.operator, w.value));
      });
    }

    // Add ordering
    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy, options.orderDirection || 'asc'));
    }

    // Add pagination cursor
    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter));
    }

    // Add limit
    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    return constraints;
  }

  /**
   * Get a single document by ID
   * @param id Document ID
   * @returns Service result with document data or null if not found
   */
  async getById(id: string): Promise<ServiceResult<T>> {
    try {
      const docRef = this.getDocRef(id);
      const snapshot = await getDoc(docRef);
      const data = this.snapshotToData(snapshot);
      
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Get all documents matching query options
   * @param options Query options for filtering, sorting, limiting
   * @returns Service result with array of documents
   */
  async getAll(options: QueryOptions = {}): Promise<ServiceResult<T[]>> {
    try {
      const constraints = this.buildQueryConstraints(options);
      const q = query(this.getCollection(), ...constraints);
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => this.snapshotToData(doc)!);
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Get paginated results
   * @param options Query options including pagination cursor
   * @returns Paginated result with data and pagination info
   */
  async getPaginated(options: QueryOptions): Promise<ServiceResult<PaginatedResult<T>>> {
    try {
      const pageSize = options.limit || 20;
      const constraints = this.buildQueryConstraints({
        ...options,
        limit: pageSize + 1, // Fetch one extra to check if there are more
      });
      
      const q = query(this.getCollection(), ...constraints);
      const snapshot = await getDocs(q);
      
      const hasMore = snapshot.docs.length > pageSize;
      const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;
      const data = docs.map(doc => this.snapshotToData(doc)!);
      const lastDoc = docs[docs.length - 1] || null;
      
      return {
        success: true,
        data: {
          data,
          hasMore,
          lastDoc,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Create a new document
   * @param data Document data (without id, createdAt, updatedAt)
   * @param options Create options (userId, customId)
   * @returns Service result with created document
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, options: CreateOptions = {}): Promise<ServiceResult<T>> {
    try {
      const id = options.customId || this.generateId();
      const now = this.timestamp();
      
      const fullData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
        ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
      } as T;

      const docRef = this.getDocRef(id);
      await setDoc(docRef, fullData as any);
      
      return {
        success: true,
        data: fullData,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Update an existing document
   * @param id Document ID
   * @param data Partial document data to update
   * @param options Update options (userId, merge)
   * @returns Service result with updated document
   */
  async update(id: string, data: Partial<Omit<T, 'id'>>, options: UpdateOptions = {}): Promise<ServiceResult<T>> {
    try {
      const docRef = this.getDocRef(id);
      const now = this.timestamp();
      
      const updateData = {
        ...data,
        updatedAt: now,
        ...(options.userId && { updatedBy: options.userId }),
      };
      
      await updateDoc(docRef, updateData);
      
      // Fetch updated document
      const snapshot = await getDoc(docRef);
      const updatedDoc = this.snapshotToData(snapshot);
      
      return {
        success: true,
        data: updatedDoc as T,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Delete a document
   * @param id Document ID
   * @param options Delete options (soft delete, userId)
   * @returns Service result indicating success or failure
   */
  async delete(id: string, options: DeleteOptions = {}): Promise<ServiceResult<void>> {
    try {
      if (options.soft) {
        // Soft delete: mark as deleted instead of removing
        await this.update(id, {
          deleted: true,
          deletedAt: this.timestamp(),
          ...(options.userId && { deletedBy: options.userId }),
        } as any);
      } else {
        // Hard delete: remove from Firestore
        const docRef = this.getDocRef(id);
        await deleteDoc(docRef);
      }
      
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Check if a document exists
   * @param id Document ID
   * @returns True if document exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const docRef = this.getDocRef(id);
      const snapshot = await getDoc(docRef);
      return snapshot.exists();
    } catch (error) {
      return false;
    }
  }

  /**
   * Count documents matching query
   * @param options Query options for filtering
   * @returns Number of matching documents
   */
  async count(options: QueryOptions = {}): Promise<number> {
    try {
      const result = await this.getAll(options);
      return result.data?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Batch create multiple documents
   * @param items Array of documents to create
   * @param options Create options
   * @returns Batch operation result
   */
  async batchCreate(items: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>, options: CreateOptions = {}): Promise<BatchOperationResult> {
    const batch = writeBatch(this.firestore);
    const result: BatchOperationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const now = this.timestamp();
      
      items.forEach((item, index) => {
        try {
          const id = this.generateId();
          const fullData = {
            ...item,
            id,
            createdAt: now,
            updatedAt: now,
            ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
          };
          
          const docRef = this.getDocRef(id);
          batch.set(docRef, fullData);
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({ id: `item-${index}`, error: error as Error });
        }
      });

      await batch.commit();
    } catch (error) {
      result.failed = items.length;
      result.success = 0;
    }

    return result;
  }

  /**
   * Subscribe to a single document's changes in real-time
   * @param id Document ID
   * @param callback Function called when document changes
   * @returns Unsubscribe function
   */
  subscribeToDocument(id: string, callback: SubscriptionCallback<T>): UnsubscribeFunction {
    const docRef = this.getDocRef(id);
    
    return onSnapshot(
      docRef,
      (snapshot) => {
        const data = this.snapshotToData(snapshot);
        callback(data as T, null);
      },
      (error) => {
        callback(null, error);
      }
    );
  }

  /**
   * Subscribe to collection changes in real-time
   * @param options Query options
   * @param callback Function called when collection changes
   * @returns Unsubscribe function
   */
  subscribeToCollection(options: QueryOptions, callback: SubscriptionCallback<T[]>): UnsubscribeFunction {
    const constraints = this.buildQueryConstraints(options);
    const q = query(this.getCollection(), ...constraints);
    
    return onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => this.snapshotToData(doc)!);
        callback(data, null);
      },
      (error) => {
        callback(null, error);
      }
    );
  }
}
