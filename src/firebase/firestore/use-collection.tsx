'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Player } from '@/lib/types';


/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Directly use memoizedTargetRefOrQuery as it's assumed to be the final query
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        // Compute a useful path for logs/errors
        let path: string;
        try {
          if ((memoizedTargetRefOrQuery as any)?.type === 'collection') {
            path = (memoizedTargetRefOrQuery as CollectionReference).path;
          } else {
            const internalQuery = memoizedTargetRefOrQuery as unknown as InternalQuery;
            path = internalQuery._query?.path?.canonicalString() || 'collection-group-query';
          }
        } catch (e) {
          console.warn('[useCollection] Failed to extract path for query:', e);
          path = 'unknown-query-path';
        }

        // 1) Missing index (failed-precondition) → warn and return empty data
        const isIndexMissing =
          error.code === 'failed-precondition' || /create_exemption=/.test(error.message) || /index/i.test(error.message);
        if (isIndexMissing) {
          const linkMatch = error.message.match(/https?:\/\/\S+/);
          if (linkMatch) {
            console.warn(`[useCollection] Missing Firestore index for "${path}". Create it here: ${linkMatch[0]}`);
          } else {
            console.warn(`[useCollection] Missing Firestore index for "${path}". Query will return empty array in dev.`);
          }
          setData([]);
          setError(null);
          setIsLoading(false);
          return;
        }

        // 2) Permission denied in development → warn and return empty data
        if (error.code === 'permission-denied' || /permission/i.test(error.message)) {
          console.warn('[useCollection] ⚠️ Permission denied - returning empty array for development mode');
          console.warn('[useCollection] Query path:', path);
          setData([]);
          setError(null);
          setIsLoading(false);
          return;
        }

        // 3) Other errors → log as error and surface contextual error
        console.error('[useCollection] Firestore error:', error.code, error.message);
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });
        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // Re-run if the target query/reference changes.
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error('useCollection was not properly memoized using useMemoFirebase. The query was: ' + memoizedTargetRefOrQuery);
  }
  return { data, isLoading, error };
}
