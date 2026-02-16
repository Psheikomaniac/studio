/**
 * Custom hook to aggregate all transactions from all players
 * This hook uses Firestore collection group queries to fetch data from all subcollections
 */

'use client';

import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { useEffect, useState } from 'react';
import {
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
  type DocumentData,
  type Query,
} from 'firebase/firestore';
import { useMemoFirebase, type UseCollectionResult, type WithId } from '@/firebase';
import type { Fine, Payment, DuePayment, BeverageConsumption } from '@/lib/types';

const DEBUG_LOGS = process.env.NEXT_PUBLIC_FIREBASE_DEBUG_LOGS === 'true';

/**
 * One-shot query hook.
 *
 * Rationale:
 * We intentionally avoid `onSnapshot` for these collectionGroup aggregation queries because
 * Safari/WebChannel watch streams have shown rare internal assertion failures (ca9/b815).
 *
 * For dashboard/statistics, a one-time fetch is sufficient and much more stable.
 */
function useQueryOnce<T>(
  memoizedQuery: (Query<DocumentData> & { __memo?: boolean }) | null
): UseCollectionResult<T> {
  const [data, setData] = useState<Array<WithId<T>> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const snapshot = await getDocs(memoizedQuery);
        if (cancelled) return;

        const results: Array<WithId<T>> = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as T),
          id: docSnap.id,
        }));

        setData(results);
        setIsLoading(false);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e as Error);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [memoizedQuery]);

  return { data, isLoading, error };
}

/**
 * Hook to get all fines across all players using collection group query
 */
export function useAllFines(options?: { limit?: number; teamId?: string | null }) {
  const firebase = useFirebaseOptional();
  const teamId = options?.teamId;

  const finesQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) {
      if (DEBUG_LOGS) console.log('[useAllFines] Firebase not available, returning null');
      return null;
    }
    // Use collection group query to get all fines from all users
    if (DEBUG_LOGS) console.log('[useAllFines] Creating collection group query for fines');
    const finesGroup = collectionGroup(firebase.firestore, 'fines');
    const constraints = [
      ...(teamId ? [where('teamId', '==', teamId)] : []),
      firestoreOrderBy('date', 'desc'),
      ...(options?.limit ? [firestoreLimit(options.limit)] : []),
    ];
    const q = query(finesGroup, ...constraints);
    if (DEBUG_LOGS) console.log('[useAllFines] Query created:', q);
    return q;
  }, [firebase?.firestore, options?.limit, teamId]);

  if (DEBUG_LOGS) console.log('[useAllFines] Returning query:', finesQuery);
  return useQueryOnce<Fine>(finesQuery);
}

/**
 * Hook to get all payments across all players using collection group query
 */
export function useAllPayments(options?: { limit?: number; teamId?: string | null }) {
  const firebase = useFirebaseOptional();
  const teamId = options?.teamId;

  const paymentsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all payments from all users
    const paymentsGroup = collectionGroup(firebase.firestore, 'payments');
    const constraints = [
      ...(teamId ? [where('teamId', '==', teamId)] : []),
      firestoreOrderBy('date', 'desc'),
      ...(options?.limit ? [firestoreLimit(options.limit)] : []),
    ];
    return query(paymentsGroup, ...constraints);
  }, [firebase?.firestore, options?.limit, teamId]);

  return useQueryOnce<Payment>(paymentsQuery);
}

/**
 * Hook to get all due payments across all players using collection group query
 */
export function useAllDuePayments(options?: { limit?: number; teamId?: string | null }) {
  const firebase = useFirebaseOptional();
  const teamId = options?.teamId;

  const duePaymentsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all due payments from all users
    const duePaymentsGroup = collectionGroup(firebase.firestore, 'duePayments');
    const constraints = [
      ...(teamId ? [where('teamId', '==', teamId)] : []),
      firestoreOrderBy('createdAt', 'desc'),
      ...(options?.limit ? [firestoreLimit(options.limit)] : []),
    ];
    return query(duePaymentsGroup, ...constraints);
  }, [firebase?.firestore, options?.limit, teamId]);

  return useQueryOnce<DuePayment>(duePaymentsQuery);
}

/**
 * Hook to get all beverage consumptions across all players using collection group query
 * @deprecated Use useAllFines() and filter by fineType='beverage' instead. Will be removed in PR 4.
 */
export function useAllBeverageConsumptions(options?: { limit?: number; teamId?: string | null }) {
  const firebase = useFirebaseOptional();
  const teamId = options?.teamId;

  const consumptionsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all beverage consumptions from all users
    const consumptionsGroup = collectionGroup(firebase.firestore, 'beverageConsumptions');
    const constraints = [
      ...(teamId ? [where('teamId', '==', teamId)] : []),
      firestoreOrderBy('date', 'desc'),
      ...(options?.limit ? [firestoreLimit(options.limit)] : []),
    ];
    return query(consumptionsGroup, ...constraints);
  }, [firebase?.firestore, options?.limit, teamId]);

  return useQueryOnce<BeverageConsumption>(consumptionsQuery);
}
