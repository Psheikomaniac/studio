/**
 * Service Layer Type Definitions
 * Common interfaces and types used across all Firebase services
 */

import type { DocumentSnapshot, WhereFilterOp, OrderByDirection } from 'firebase/firestore';

/**
 * Standard result wrapper for service operations
 * Provides consistent error handling across all services
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Options for querying Firestore collections
 */
export interface QueryOptions {
  /** Maximum number of documents to return */
  limit?: number;
  /** Field to order results by */
  orderBy?: string;
  /** Direction to order results */
  orderDirection?: OrderByDirection;
  /** Cursor for pagination (start after this document) */
  startAfter?: any;
  /** Where clause filters */
  where?: Array<{
    field: string;
    operator: WhereFilterOp;
    value: any;
  }>;
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  /** Array of documents */
  data: T[];
  /** Whether there are more documents to fetch */
  hasMore: boolean;
  /** Last document snapshot for pagination cursor */
  lastDoc: DocumentSnapshot | null;
}

/**
 * Base document interface with audit fields
 */
export interface BaseDocument {
  /** Document ID */
  id: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** User ID who created the document */
  createdBy?: string;
  /** User ID who last updated the document */
  updatedBy?: string;
}

/**
 * Options for create operations
 */
export interface CreateOptions {
  /** User ID to set as createdBy/updatedBy */
  userId?: string;
  /** Custom ID instead of auto-generated */
  customId?: string;
}

/**
 * Options for update operations
 */
export interface UpdateOptions {
  /** User ID to set as updatedBy */
  userId?: string;
  /** Whether to merge with existing data (true) or overwrite (false) */
  merge?: boolean;
}

/**
 * Options for delete operations
 */
export interface DeleteOptions {
  /** Soft delete: mark as deleted instead of removing */
  soft?: boolean;
  /** User ID who performed the delete */
  userId?: string;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  /** Number of successful operations */
  success: number;
  /** Number of failed operations */
  failed: number;
  /** Array of errors encountered */
  errors: Array<{ id: string; error: Error }>;
}

/**
 * Callback for real-time subscriptions
 */
export type SubscriptionCallback<T> = (data: T | null, error: Error | null) => void;

/**
 * Unsubscribe function for real-time listeners
 */
export type UnsubscribeFunction = () => void;
