/**
 * Custom hook to aggregate all transactions from all players
 * This hook uses Firestore collection group queries to fetch data from all subcollections
 */

'use client';

import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { collection, collectionGroup, query, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { useMemoFirebase, useCollection } from '@/firebase';
import type { Fine, Payment, DuePayment, BeverageConsumption } from '@/lib/types';

/**
 * Hook to get all fines across all players using collection group query
 */
export function useAllFines() {
  const firebase = useFirebaseOptional();

  const finesQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all fines from all users
    const finesGroup = collectionGroup(firebase.firestore, 'fines');
    return query(finesGroup, firestoreOrderBy('date', 'desc'));
  }, [firebase?.firestore]);

  return useCollection<Fine>(finesQuery);
}

/**
 * Hook to get all payments across all players using collection group query
 */
export function useAllPayments() {
  const firebase = useFirebaseOptional();

  const paymentsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all payments from all users
    const paymentsGroup = collectionGroup(firebase.firestore, 'payments');
    return query(paymentsGroup, firestoreOrderBy('date', 'desc'));
  }, [firebase?.firestore]);

  return useCollection<Payment>(paymentsQuery);
}

/**
 * Hook to get all due payments across all players using collection group query
 */
export function useAllDuePayments() {
  const firebase = useFirebaseOptional();

  const duePaymentsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all due payments from all users
    const duePaymentsGroup = collectionGroup(firebase.firestore, 'duePayments');
    return query(duePaymentsGroup, firestoreOrderBy('createdAt', 'desc'));
  }, [firebase?.firestore]);

  return useCollection<DuePayment>(duePaymentsQuery);
}

/**
 * Hook to get all beverage consumptions across all players using collection group query
 */
export function useAllBeverageConsumptions() {
  const firebase = useFirebaseOptional();

  const consumptionsQuery = useMemoFirebase(() => {
    if (!firebase?.firestore) return null;
    // Use collection group query to get all beverage consumptions from all users
    const consumptionsGroup = collectionGroup(firebase.firestore, 'beverageConsumptions');
    return query(consumptionsGroup, firestoreOrderBy('date', 'desc'));
  }, [firebase?.firestore]);

  return useCollection<BeverageConsumption>(consumptionsQuery);
}
