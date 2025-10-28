/**
 * Optional Firebase Hook
 *
 * This hook returns Firebase services if available, or null if Firebase is not initialized.
 * Unlike useFirebase() which throws an error, this hook is safe to use outside of FirebaseProvider.
 */

'use client';

import { useContext } from 'react';
import { FirebaseContext, type FirebaseServicesAndUser } from '@/firebase/provider';

/**
 * Hook to optionally access Firebase services
 * Returns Firebase services if available, otherwise null
 */
export function useFirebaseOptional(): FirebaseServicesAndUser | null {
  const context = useContext(FirebaseContext);

  // If context is undefined or services are not available, return null
  if (context === undefined || !context.areServicesAvailable) {
    return null;
  }

  if (!context.firebaseApp || !context.firestore || !context.auth) {
    return null;
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
}
