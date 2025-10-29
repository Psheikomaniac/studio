/**
 * Custom hook to aggregate all transactions from all players
 * This hook uses Firestore collection group queries to fetch data from all subcollections
 */

'use client';

import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { collection, collectionGroup, query, orderBy as firestoreOrderBy, limit as firestoreLimit } from 'firebase/firestore';
import { useMemoFirebase, useCollection } from '@/firebase';
import type { Fine, Payment, DuePayment, BeverageConsumption } from '@/lib/types';

const DEBUG_LOGS = process.env.NEXT_PUBLIC_FIREBASE_DEBUG_LOGS === 'true';

/**
 * Hook to get all fines across all players using collection group query
 */
export function useAllFines(options?: { limit?: number }) {
  const firebase = useFirebaseOptional();

  const finesQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) {
      if (DEBUG_LOGS) console.log('[useAllFines] Firebase not available, returning null');
      return null;
    }
    // Use collection group query to get all fines from all users
    if (DEBUG_LOGS) console.log('[useAllFines] Creating collection group query for fines');
    const finesGroup = collectionGroup(firebase.firestore, 'fines');
    const base = query(finesGroup, firestoreOrderBy('date', 'desc'));
    const q = options?.limit ? query(base, firestoreLimit(options.limit)) : base;
    if (DEBUG_LOGS) console.log('[useAllFines] Query created:', q);
    return q;
  }, [firebase?.firestore, options?.limit]);

  if (DEBUG_LOGS) console.log('[useAllFines] Returning query:', finesQuery);
  return useCollection<Fine>(finesQuery);
}

/**
 * Hook to get all payments across all players using collection group query
 */
export function useAllPayments(options?: { limit?: number }) {
  const firebase = useFirebaseOptional();

  const paymentsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all payments from all users
    const paymentsGroup = collectionGroup(firebase.firestore, 'payments');
    const base = query(paymentsGroup, firestoreOrderBy('date', 'desc'));
    return options?.limit ? query(base, firestoreLimit(options.limit)) : base;
  }, [firebase?.firestore, options?.limit]);

  return useCollection<Payment>(paymentsQuery);
}

/**
 * Hook to get all due payments across all players using collection group query
 */
export function useAllDuePayments(options?: { limit?: number }) {
  const firebase = useFirebaseOptional();

  const duePaymentsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all due payments from all users
    const duePaymentsGroup = collectionGroup(firebase.firestore, 'duePayments');
    const base = query(duePaymentsGroup, firestoreOrderBy('createdAt', 'desc'));
    return options?.limit ? query(base, firestoreLimit(options.limit)) : base;
  }, [firebase?.firestore, options?.limit]);

  return useCollection<DuePayment>(duePaymentsQuery);
}

/**
 * Hook to get all beverage consumptions across all players using collection group query
 */
export function useAllBeverageConsumptions(options?: { limit?: number }) {
  const firebase = useFirebaseOptional();

  const consumptionsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all beverage consumptions from all users
    const consumptionsGroup = collectionGroup(firebase.firestore, 'beverageConsumptions');
    const base = query(consumptionsGroup, firestoreOrderBy('date', 'desc'));
    return options?.limit ? query(base, firestoreLimit(options.limit)) : base;
  }, [firebase?.firestore, options?.limit]);

  return useCollection<BeverageConsumption>(consumptionsQuery);
}
