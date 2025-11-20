/**
 * DuesService - Manages due payments in Firestore
 * Handles CRUD operations for due payments with auto-payment logic and real-time hooks
 *
 * CRITICAL BUSINESS LOGIC:
 * - Due payments are stored in nested collections: /users/{userId}/duePayments/{duePaymentId}
 * - Auto-payment logic applies player balance to new due payments
 * - Supports partial payments via amountPaid field
 * - Supports exempt status for players who don't need to pay
 */

'use client';

import {
  collection,
  doc,
  query,
  orderBy,
  runTransaction,
  increment,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { useMemo } from 'react';
import { BaseFirebaseService } from './base.service';
import type { ServiceResult, CreateOptions, UpdateOptions, DeleteOptions } from './types';
import type { DuePayment } from '@/lib/types';
import { useMemoFirebase, useCollection } from '@/firebase';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Extended create options for due payments
 */
interface DuePaymentCreateOptions extends CreateOptions {
  /** Player's current balance for auto-payment calculation */
  playerBalance?: number;
}

/**
 * Service class for managing due payments
 * Provides due payment-specific operations with auto-payment logic
 */
export class DuesService extends BaseFirebaseService<DuePayment> {
  constructor(firestore: Firestore, private userId: string) {
    super(firestore, `users/${userId}/duePayments`);
  }

  /**
   * Create a new due payment with auto-payment logic
   *
   * Auto-payment logic:
   * - If exempt=true: no auto-payment applied
   * - If playerBalance >= amountDue: mark as paid, set amountPaid = amountDue
   * - If 0 < playerBalance < amountDue: mark as unpaid, set amountPaid = playerBalance (partial)
   * - If playerBalance <= 0: mark as unpaid, amountPaid = undefined
   *
   * @param duePaymentData Due payment data without id, createdAt, updatedAt, paid, amountPaid
   * @param options Create options including playerBalance for auto-payment
   * @returns Service result with created due payment
   */
  async createDuePayment(
    duePaymentData: Omit<DuePayment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt' | 'amountPaid'>,
    options: DuePaymentCreateOptions = {}
  ): Promise<ServiceResult<DuePayment>> {
    try {
      const id = options.customId || this.generateId();
      const now = this.timestamp();
      const { playerBalance = 0 } = options;

      // Apply auto-payment logic (skip if exempt)
      let paid = false;
      let paidAt: string | undefined = undefined;
      let amountPaid: number | undefined = undefined;

      if (!duePaymentData.exempt) {
        const hasFullCredit = playerBalance >= duePaymentData.amountDue;
        const hasPartialCredit = playerBalance > 0 && playerBalance < duePaymentData.amountDue;

        if (hasFullCredit) {
          // Full payment
          paid = true;
          paidAt = now;
          amountPaid = duePaymentData.amountDue;
        } else if (hasPartialCredit) {
          // Partial payment
          paid = false;
          amountPaid = playerBalance;
        }
      }
      // else: exempt or no payment (paid=false, amountPaid=undefined)

      const fullData = {
        ...duePaymentData,
        id,
        paid,
        paidAt,
        amountPaid,
        createdAt: now,
        updatedAt: now,
        ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
      } as DuePayment;

      const docRef = this.getDocRef(id);
      const userRef = doc(this.firestore, 'users', this.userId);

      await runTransaction(this.firestore, async (transaction) => {
        transaction.set(docRef, fullData);
        if (!fullData.exempt) {
            transaction.update(userRef, { balance: increment(-fullData.amountDue) });
        }
      });

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
   * Create a new due payment with auto-payment logic (non-blocking)
   *
   * @param duePaymentData Due payment data without id, createdAt, updatedAt, paid, amountPaid
   * @param options Create options including playerBalance for auto-payment
   * @returns Due payment ID
   */
  createDuePaymentNonBlocking(
    duePaymentData: Omit<DuePayment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt' | 'amountPaid'>,
    options: DuePaymentCreateOptions = {}
  ): string {
    const id = options.customId || this.generateId();
    const now = this.timestamp();
    const { playerBalance = 0 } = options;

    // Apply auto-payment logic (skip if exempt)
    let paid = false;
    let paidAt: string | undefined = undefined;
    let amountPaid: number | undefined = undefined;

    if (!duePaymentData.exempt) {
      const hasFullCredit = playerBalance >= duePaymentData.amountDue;
      const hasPartialCredit = playerBalance > 0 && playerBalance < duePaymentData.amountDue;

      if (hasFullCredit) {
        paid = true;
        paidAt = now;
        amountPaid = duePaymentData.amountDue;
      } else if (hasPartialCredit) {
        paid = false;
        amountPaid = playerBalance;
      }
    }

    const fullData = {
      ...duePaymentData,
      id,
      paid,
      paidAt,
      amountPaid,
      createdAt: now,
      updatedAt: now,
      ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(id);
    setDocumentNonBlocking(docRef, fullData, {});

    return id;
  }

  /**
   * Update due payment payment status (use with transactions for consistency)
   *
   * @param duePaymentId Due payment ID
   * @param additionalPayment Additional payment amount to apply
   * @param options Update options
   * @returns Service result with updated due payment
   */
  async updateDuePayment(
    duePaymentId: string,
    additionalPayment: number,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<DuePayment>> {
    try {
      const docRef = this.getDocRef(duePaymentId);
      const userRef = doc(this.firestore, 'users', this.userId);
      const now = this.timestamp();

      const updatedDuePayment = await runTransaction(this.firestore, async (transaction) => {
        const duePaymentDoc = await transaction.get(docRef);

        if (!duePaymentDoc.exists()) {
          throw new Error('Due payment not found');
        }

        const currentDuePayment = duePaymentDoc.data() as DuePayment;
        const currentAmountPaid = currentDuePayment.amountPaid || 0;
        const newAmountPaid = currentAmountPaid + additionalPayment;
        const isPaid = newAmountPaid >= currentDuePayment.amountDue;

        const updateData = {
          amountPaid: newAmountPaid,
          paid: isPaid,
          paidAt: isPaid ? now : currentDuePayment.paidAt,
          updatedAt: now,
          ...(options.userId && { updatedBy: options.userId }),
        };
        
        if (!currentDuePayment.exempt) {
             transaction.update(userRef, { balance: increment(additionalPayment) });
        }

        transaction.update(docRef, updateData);

        return { ...currentDuePayment, ...updateData };
      });

      return {
        success: true,
        data: updatedDuePayment,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Toggle due payment paid status (mark as paid/unpaid)
   *
   * @param duePaymentId Due payment ID
   * @param paid New paid status
   * @param options Update options
   * @returns Service result with updated due payment
   */
  async toggleDuePaid(
    duePaymentId: string,
    paid: boolean,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<DuePayment>> {
    try {
      const docRef = this.getDocRef(duePaymentId);
      const userRef = doc(this.firestore, 'users', this.userId);
      const now = this.timestamp();

      const updatedDuePayment = await runTransaction(this.firestore, async (transaction) => {
        const duePaymentDoc = await transaction.get(docRef);

        if (!duePaymentDoc.exists()) {
          throw new Error('Due payment not found');
        }

        const currentDuePayment = duePaymentDoc.data() as DuePayment;

        const updateData = {
          paid,
          paidAt: paid ? now : null,
          amountPaid: paid ? currentDuePayment.amountDue : (currentDuePayment.amountPaid || null),
          updatedAt: now,
          ...(options.userId && { updatedBy: options.userId }),
        };

        if (!currentDuePayment.exempt) {
             const oldDebit = currentDuePayment.paid ? 0 : (currentDuePayment.amountDue - (currentDuePayment.amountPaid || 0));
             const newAmountPaid = updateData.amountPaid || 0;
             const newDebit = paid ? 0 : (currentDuePayment.amountDue - newAmountPaid);
             const balanceChange = oldDebit - newDebit;

             if (balanceChange !== 0) {
                 transaction.update(userRef, { balance: increment(balanceChange) });
             }
        }

        transaction.update(docRef, updateData);

        return { ...currentDuePayment, ...updateData };
      });

      return {
        success: true,
        data: updatedDuePayment,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Toggle due payment paid status (non-blocking)
   *
   * @param duePaymentId Due payment ID
   * @param paid New paid status
   * @param options Update options
   */
  toggleDuePaidNonBlocking(
    duePaymentId: string,
    paid: boolean,
    options: UpdateOptions = {}
  ): void {
    const now = this.timestamp();
    const docRef = this.getDocRef(duePaymentId);

    // Note: This is non-blocking and doesn't fetch current state
    // Use with caution - prefer the transactional version
    updateDocumentNonBlocking(docRef, {
      paid,
      paidAt: paid ? now : null,
      updatedAt: now,
      ...(options.userId && { updatedBy: options.userId }),
    });
  }

  /**
   * Update an existing due payment
   *
   * @param duePaymentId Due payment ID
   * @param duePaymentData Partial due payment data to update
   * @param options Update options
   * @returns Service result with updated due payment
   */
  async update(
    duePaymentId: string,
    duePaymentData: Partial<Omit<DuePayment, 'id'>>,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<DuePayment>> {
    return super.update(duePaymentId, duePaymentData as any, options);
  }

  /**
   * Update an existing due payment (non-blocking)
   *
   * @param duePaymentId Due payment ID
   * @param duePaymentData Partial due payment data to update
   * @param options Update options
   */
  updateNonBlocking(
    duePaymentId: string,
    duePaymentData: Partial<Omit<DuePayment, 'id'>>,
    options: UpdateOptions = {}
  ): void {
    const now = this.timestamp();
    const updateData = {
      ...duePaymentData,
      updatedAt: now,
      ...(options.userId && { updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(duePaymentId);
    updateDocumentNonBlocking(docRef, updateData);
  }

  /**
   * Delete a due payment
   *
   * @param duePaymentId Due payment ID
   * @param options Delete options
   * @returns Service result indicating success or failure
   */
  async deleteDuePayment(
    duePaymentId: string,
    options: DeleteOptions = {}
  ): Promise<ServiceResult<void>> {
    try {
      const docRef = this.getDocRef(duePaymentId);
      const userRef = doc(this.firestore, 'users', this.userId);

      await runTransaction(this.firestore, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
             throw new Error('Due payment not found');
        }
        const duePayment = docSnap.data() as DuePayment;
        
        transaction.delete(docRef);
        
        if (!duePayment.exempt) {
            transaction.update(userRef, { balance: increment(duePayment.amountDue) });
        }
      });
      
      return { success: true, data: undefined };
    } catch (error) {
        return { success: false, error: error as Error };
    }
  }

  /**
   * Delete a due payment (non-blocking)
   *
   * @param duePaymentId Due payment ID
   * @param options Delete options
   */
  deleteDuePaymentNonBlocking(
    duePaymentId: string,
    options: DeleteOptions = {}
  ): void {
    if (options.soft) {
      this.updateNonBlocking(duePaymentId, {
        deleted: true,
        deletedAt: this.timestamp(),
        ...(options.userId && { deletedBy: options.userId }),
      } as any);
    } else {
      const docRef = this.getDocRef(duePaymentId);
      deleteDocumentNonBlocking(docRef);
    }
  }

  /**
   * Get reference to a due payment document
   *
   * @param duePaymentId Due payment ID
   * @returns DocumentReference for the due payment
   */
  getDuePaymentRef(duePaymentId: string): DocumentReference {
    return doc(this.firestore, `users/${this.userId}/duePayments`, duePaymentId);
  }

  /**
   * Get reference to the due payments collection for a user
   *
   * @returns CollectionReference for user's due payments
   */
  getDuePaymentsCollectionRef(): CollectionReference {
    return collection(this.firestore, `users/${this.userId}/duePayments`);
  }
}

/**
 * Hook to get the DuesService instance for a specific user
 *
 * @param userId User ID to get dues service for
 * @returns DuesService instance or null if userId not provided
 * @example
 * const duesService = useDuesService(playerId);
 * if (duesService) {
 *   await duesService.createDuePayment({ dueId: 'season2526', amountDue: 50, ... });
 * }
 */
export function useDuesService(userId: string | null | undefined): DuesService | null {
  const firebase = useFirebaseOptional();

  return useMemo(() => {
    if (!userId || !firebase?.firestore) return null;
    return new DuesService(firebase.firestore, userId);
  }, [firebase?.firestore, userId]);
}

/**
 * Hook to subscribe to a player's due payments in real-time
 *
 * @param userId User ID to fetch due payments for
 * @returns Hook result with due payments array, loading state, and error
 * @example
 * const { data: duePayments, isLoading, error } = usePlayerDuePayments(playerId);
 */
export function usePlayerDuePayments(userId: string | null | undefined) {
  const firebase = useFirebaseOptional();

  const duePaymentsQuery = useMemoFirebase(() => {
    if (!userId || !firebase?.firestore) return null;
    const duePaymentsCol = collection(firebase.firestore, `users/${userId}/duePayments`);
    return query(duePaymentsCol, orderBy('createdAt', 'desc'));
  }, [firebase?.firestore, userId]);

  return useCollection<DuePayment>(duePaymentsQuery);
}
