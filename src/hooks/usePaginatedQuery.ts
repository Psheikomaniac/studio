/**
 * Firestore Pagination Hook
 * 
 * Provides infinite scrolling and manual pagination for Firestore collections.
 * Uses React Query for state management and caching.
 * 
 * Features:
 * - Infinite scroll support
 * - Manual pagination (next/prev)
 * - Automatic loading states
 * - Smart caching
 * - Type-safe
 * 
 * @example
 * ```typescript
 * const { data, fetchNextPage, hasNextPage } = usePaginatedQuery<Fine>(
 *   'fines',
 *   50,
 *   'createdAt'
 * );
 * ```
 */

'use client';

import { useInfiniteQuery, UseInfiniteQueryResult } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  where,
  Query,
  Firestore,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export interface PaginatedPage<T> {
  docs: T[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface UsePaginatedQueryOptions {
  /** Custom query constraints (e.g., where clauses) */
  queryConstraints?: any[];
  /** Enable/disable query */
  enabled?: boolean;
  /** Firestore instance (optional, will use default if not provided) */
  firestore?: Firestore;
}

/**
 * Hook for paginated Firestore queries
 * 
 * @param collectionName - Name of the Firestore collection
 * @param pageSize - Number of documents per page (default: 50)
 * @param orderByField - Field to sort by (default: 'createdAt')
 * @param orderDirection - Sort direction (default: 'desc')
 * @param options - Additional query options
 * @returns React Query infinite query result
 */
export function usePaginatedQuery<T extends { id: string }>(
  collectionName: string,
  pageSize: number = 50,
  orderByField: string = 'createdAt',
  orderDirection: 'asc' | 'desc' = 'desc',
  options: UsePaginatedQueryOptions = {}
): UseInfiniteQueryResult<PaginatedPage<T>, Error> {
  const { queryConstraints = [], enabled = true, firestore: customFirestore } = options;

  return useInfiniteQuery<PaginatedPage<T>, Error>({
    queryKey: [collectionName, pageSize, orderByField, orderDirection, ...queryConstraints],
    
    queryFn: async ({ pageParam }): Promise<PaginatedPage<T>> => {
      // Get Firestore instance
      const { firestore } = customFirestore ? { firestore: customFirestore } : initializeFirebase();
      
      // Build query
      const collectionRef = collection(firestore, collectionName);
      const constraints = [
        ...queryConstraints,
        orderBy(orderByField, orderDirection),
        limit(pageSize),
      ];
      
      // Add cursor if paginating
      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }
      
      const q = query(collectionRef, ...constraints);
      
      // Fetch documents
      const snapshot = await getDocs(q);
      
      // Map to typed documents
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));
      
      // Determine if there are more pages
      const hasMore = docs.length === pageSize;
      const nextCursor = hasMore ? snapshot.docs[snapshot.docs.length - 1] : null;
      
      return {
        docs,
        nextCursor,
        hasMore,
      };
    },
    
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    
    enabled,
    
    // Stale time: 1 minute (data is considered fresh for 1 min)
    staleTime: 60 * 1000,
    
    // Cache time: 5 minutes (keep in cache for 5 min after component unmounts)
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for searching with pagination
 * Useful for filtered queries with user input
 * 
 * @example
 * ```typescript
 * const { data } = useSearchPaginated<Fine>(
 *   'fines',
 *   'userId',
 *   userId,
 *   25
 * );
 * ```
 */
export function useSearchPaginated<T extends { id: string }>(
  collectionName: string,
  searchField: string,
  searchValue: string,
  pageSize: number = 25
): UseInfiniteQueryResult<PaginatedPage<T>, Error> {
  return usePaginatedQuery<T>(
    collectionName,
    pageSize,
    searchField,
    'asc',
    {
      queryConstraints: [
        where(searchField, '>=', searchValue),
        where(searchField, '<=', searchValue + '\uf8ff'),
      ],
      enabled: searchValue.length > 0,
    }
  );
}

/**
 * Hook for team-scoped paginated queries
 * Automatically filters by teamId
 * 
 * @example
 * ```typescript
 * const { data } = useTeamPaginatedQuery<Fine>(
 *   'fines',
 *   'team-123',
 *   50
 * );
 * ```
 */
export function useTeamPaginatedQuery<T extends { id: string }>(
  collectionName: string,
  teamId: string,
  pageSize: number = 50,
  orderByField: string = 'createdAt'
): UseInfiniteQueryResult<PaginatedPage<T>, Error> {
  return usePaginatedQuery<T>(
    collectionName,
    pageSize,
    orderByField,
    'desc',
    {
      queryConstraints: [where('teamId', '==', teamId)],
      enabled: !!teamId,
    }
  );
}
