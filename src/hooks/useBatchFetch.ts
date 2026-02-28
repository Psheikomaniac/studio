/**
 * Batch Fetching Hooks
 * 
 * React hooks for efficient batch fetching with automatic caching.
 * Prevents N+1 query problems by batching document fetches.
 */

'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { batchFetchByIds, joinCollections, multiJoin } from '@/lib/firestore-join';

/**
 * Hook for batch fetching users by IDs
 * Automatically caches results and batches requests
 * 
 * @param userIds - Array of user IDs to fetch
 * @param options - Query options
 * @returns Map of userId -> user data
 * 
 * @example
 * ```typescript
 * const userIds = fines.map(f => f.userId);
 * const { data: users } = useBatchUsers(userIds);
 * 
 * fines.forEach(fine => {
 *   const user = users?.get(fine.userId);
 *   console.log(`${user.name} owes ${fine.amount}`);
 * });
 * ```
 */
export function useBatchUsers<T extends { id: string }>(
  userIds: string[],
  options?: {
    enabled?: boolean;
    firestore?: Firestore;
  }
): UseQueryResult<Map<string, T>, Error> {
  const { enabled = true, firestore: customFirestore } = options ?? {};

  return useQuery({
    queryKey: ['users', 'batch', [...userIds].sort()],
    
    queryFn: async () => {
      const { firestore } = customFirestore 
        ? { firestore: customFirestore } 
        : initializeFirebase();
      
      return batchFetchByIds<T>(firestore, 'users', userIds);
    },
    
    enabled: enabled && userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes (user data changes rarely)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for batch fetching any collection by IDs
 * Generic version of useBatchUsers
 * 
 * @param collectionName - Collection to fetch from
 * @param ids - Array of document IDs
 * @param options - Query options
 * @returns Map of id -> document data
 * 
 * @example
 * ```typescript
 * const teamIds = members.map(m => m.teamId);
 * const { data: teams } = useBatchFetch('teams', teamIds);
 * ```
 */
export function useBatchFetch<T extends { id: string }>(
  collectionName: string,
  ids: string[],
  options?: {
    enabled?: boolean;
    staleTime?: number;
    firestore?: Firestore;
  }
): UseQueryResult<Map<string, T>, Error> {
  const { 
    enabled = true, 
    staleTime = 5 * 60 * 1000,
    firestore: customFirestore 
  } = options ?? {};

  return useQuery({
    queryKey: [collectionName, 'batch', [...ids].sort()],
    
    queryFn: async () => {
      const { firestore } = customFirestore 
        ? { firestore: customFirestore } 
        : initializeFirebase();
      
      return batchFetchByIds<T>(firestore, collectionName, ids);
    },
    
    enabled: enabled && ids.length > 0,
    staleTime,
    gcTime: staleTime * 2,
  });
}

/**
 * Hook for joining collections with React Query caching
 * 
 * @param mainDocs - Main documents
 * @param joinField - Foreign key field
 * @param joinCollection - Collection to join with
 * @param options - Query options
 * @returns Main documents with joined data
 * 
 * @example
 * ```typescript
 * const { data: fines } = useQuery(['fines'], getFines);
 * const { data: finesWithUsers } = useJoinCollection(
 *   fines,
 *   'userId',
 *   'users'
 * );
 * 
 * finesWithUsers?.forEach(fine => {
 *   console.log(`${fine.joined.name} owes ${fine.amount}`);
 * });
 * ```
 */
export function useJoinCollection<
  TMain extends Record<string, any>,
  TJoin extends { id: string }
>(
  mainDocs: TMain[] | undefined,
  joinField: keyof TMain,
  joinCollection: string,
  options?: {
    enabled?: boolean;
    firestore?: Firestore;
  }
): UseQueryResult<Array<TMain & { joined?: TJoin }>, Error> {
  const { enabled = true, firestore: customFirestore } = options ?? {};

  return useQuery({
    queryKey: [
      'join',
      joinCollection,
      mainDocs?.map(d => d.id).sort() ?? [],
    ],
    
    queryFn: async () => {
      if (!mainDocs || mainDocs.length === 0) {
        return [];
      }

      const { firestore } = customFirestore 
        ? { firestore: customFirestore } 
        : initializeFirebase();
      
      return joinCollections<TMain, TJoin>(
        mainDocs,
        joinField,
        joinCollection,
        firestore
      );
    },
    
    enabled: enabled && !!mainDocs && mainDocs.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for multi-join with React Query caching
 * 
 * @param mainDocs - Main documents
 * @param joins - Array of join configurations
 * @param options - Query options
 * @returns Main documents with all joined data
 * 
 * @example
 * ```typescript
 * const { data: enriched } = useMultiJoin(
 *   fines,
 *   [
 *     { field: 'userId', collection: 'users', as: 'user' },
 *     { field: 'teamId', collection: 'teams', as: 'team' },
 *   ]
 * );
 * 
 * enriched?.forEach(fine => {
 *   console.log(`${fine.user.name} in ${fine.team.name}`);
 * });
 * ```
 */
export function useMultiJoin<TMain extends Record<string, any>>(
  mainDocs: TMain[] | undefined,
  joins: Array<{
    field: keyof TMain;
    collection: string;
    as: string;
  }>,
  options?: {
    enabled?: boolean;
    firestore?: Firestore;
  }
): UseQueryResult<Array<TMain & Record<string, any>>, Error> {
  const { enabled = true, firestore: customFirestore } = options ?? {};

  return useQuery({
    queryKey: [
      'multi-join',
      mainDocs?.map(d => d.id).sort() ?? [],
      joins.map(j => `${String(j.field)}-${j.collection}`).sort(),
    ],
    
    queryFn: async () => {
      if (!mainDocs || mainDocs.length === 0) {
        return [];
      }

      const { firestore } = customFirestore 
        ? { firestore: customFirestore } 
        : initializeFirebase();
      
      return multiJoin(mainDocs, joins, firestore);
    },
    
    enabled: enabled && !!mainDocs && mainDocs.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
