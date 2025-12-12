/**
 * PaymentsService - Manages payments in Firestore
 * Handles CRUD operations for payments with real-time hooks
 *
 * CRITICAL BUSINESS LOGIC:
 * - Payments are stored in nested collections: /teams/{teamId}/players/{playerId}/payments/{paymentId}
 * - All payments are always created with paid=true (they represent credits added to balance)
 * - Payments are never marked as unpaid
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
import type { Payment } from '@/lib/types';
import { useMemoFirebase, useCollection } from '@/firebase';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Service class for managing payments
 * Provides payment-specific operations
 */
export class PaymentsService extends BaseFirebaseService<Payment> {
  constructor(
    firestore: Firestore,
    private teamId: string,
    private playerId: string
  ) {
    super(firestore, `teams/${teamId}/players/${playerId}/payments`);
  }

  /**
   * Create a new payment
   * Payments are always created with paid=true as they represent credits
   *
   * @param paymentData Payment data without id, createdAt, updatedAt, paid, paidAt
   * @param options Create options
   * @returns Service result with created payment
   */
  async createPayment(
    paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'>,
    options: CreateOptions = {}
  ): Promise<ServiceResult<Payment>> {
    try {
      const id = options.customId || this.generateId();
      const now = this.timestamp();

      const fullData = {
        ...paymentData,
        userId: this.playerId,
        teamId: this.teamId,
        id,
        paid: true, // Payments are always paid (they are credits)
        paidAt: now,
        createdAt: now,
        updatedAt: now,
        ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
      } as Payment;

      const docRef = this.getDocRef(id);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);

      await runTransaction(this.firestore, async (transaction) => {
        transaction.set(docRef, fullData);
        if (fullData.paid) {
          transaction.update(playerRef, { balance: increment(fullData.amount) });
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
   * Create a new payment (non-blocking)
   * Payments are always created with paid=true as they represent credits
   *
   * @param paymentData Payment data without id, createdAt, updatedAt, paid, paidAt
   * @param options Create options
   * @returns Payment ID
   */
  createPaymentNonBlocking(
    paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'>,
    options: CreateOptions = {}
  ): string {
    const id = options.customId || this.generateId();
    const now = this.timestamp();

    const fullData = {
      ...paymentData,
      userId: this.playerId,
      teamId: this.teamId,
      id,
      paid: true,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
      ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(id);
    setDocumentNonBlocking(docRef, fullData, {});

    return id;
  }

  /**
   * Update an existing payment
   *
   * @param paymentId Payment ID
   * @param paymentData Partial payment data to update
   * @param options Update options
   * @returns Service result with updated payment
   */
  async updatePayment(
    paymentId: string,
    paymentData: Partial<Omit<Payment, 'id'>>,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<Payment>> {
    try {
      const docRef = this.getDocRef(paymentId);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);
      const now = this.timestamp();

      const updatedPayment = await runTransaction(this.firestore, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) throw new Error('Payment not found');
        const current = docSnap.data() as Payment;

        const updateData = {
          ...paymentData,
          updatedAt: now,
          ...(options.userId && { updatedBy: options.userId }),
        };

        // Balance Check
        const oldAmount = current.paid ? current.amount : 0;
        const newPaid = (updateData.paid !== undefined) ? updateData.paid : current.paid;
        const newAmountVal = (updateData.amount !== undefined) ? updateData.amount : current.amount;
        const newAmount = newPaid ? newAmountVal : 0;

        const diff = newAmount - oldAmount;

        transaction.update(docRef, updateData);
        if (diff !== 0) {
          transaction.update(playerRef, { balance: increment(diff) });
        }

        return { ...current, ...updateData } as Payment;
      });

      return { success: true, data: updatedPayment };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Update an existing payment (non-blocking)
   *
   * @param paymentId Payment ID
   * @param paymentData Partial payment data to update
   * @param options Update options
   */
  updatePaymentNonBlocking(
    paymentId: string,
    paymentData: Partial<Omit<Payment, 'id'>>,
    options: UpdateOptions = {}
  ): void {
    const now = this.timestamp();
    const updateData = {
      ...paymentData,
      updatedAt: now,
      ...(options.userId && { updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(paymentId);
    updateDocumentNonBlocking(docRef, updateData);
  }

  /**
   * Delete a payment
   *
   * @param paymentId Payment ID
   * @param options Delete options
   * @returns Service result indicating success or failure
   */
  async deletePayment(
    paymentId: string,
    options: DeleteOptions = {}
  ): Promise<ServiceResult<void>> {
    try {
      const docRef = this.getDocRef(paymentId);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);

      await runTransaction(this.firestore, async (transaction) => {
        const paymentDoc = await transaction.get(docRef);
        if (!paymentDoc.exists()) {
          throw new Error('Payment not found');
        }
        const payment = paymentDoc.data() as Payment;

        transaction.delete(docRef);

        if (payment.paid) {
          transaction.update(playerRef, { balance: increment(-payment.amount) });
        }
      });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Delete a payment (non-blocking)
   *
   * @param paymentId Payment ID
   * @param options Delete options
   */
  deletePaymentNonBlocking(
    paymentId: string,
    options: DeleteOptions = {}
  ): void {
    if (options.soft) {
      this.updatePaymentNonBlocking(paymentId, {
        deleted: true,
        deletedAt: this.timestamp(),
        ...(options.userId && { deletedBy: options.userId }),
      } as any);
    } else {
      const docRef = this.getDocRef(paymentId);
      deleteDocumentNonBlocking(docRef);
    }
  }

  /**
   * Get reference to a payment document
   *
   * @param paymentId Payment ID
   * @returns DocumentReference for the payment
   */
  getPaymentRef(paymentId: string): DocumentReference {
    return doc(this.firestore, 'teams', this.teamId, 'players', this.playerId, 'payments', paymentId);
  }

  /**
   * Get reference to the payments collection for a user
   *
   * @returns CollectionReference for user's payments
   */
  getPaymentsCollectionRef(): CollectionReference {
    return collection(this.firestore, `teams/${this.teamId}/players/${this.playerId}/payments`);
  }
  /**
   * Toggle payment paid status (mark as paid/unpaid)
   *
   * @param paymentId Payment ID
   * @param paid New paid status
   * @param options Update options
   * @returns Service result with updated payment
   */
  async togglePaymentPaid(
    paymentId: string,
    paid: boolean,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<Payment>> {
    try {
      const docRef = this.getDocRef(paymentId);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);
      const now = this.timestamp();

      const updatedPayment = await runTransaction(this.firestore, async (transaction) => {
        const paymentDoc = await transaction.get(docRef);

        if (!paymentDoc.exists()) {
          throw new Error('Payment not found');
        }

        const currentPayment = paymentDoc.data() as Payment;

        // If status isn't changing, do nothing
        if (currentPayment.paid === paid) {
          return currentPayment;
        }

        const updateData = {
          paid,
          paidAt: paid ? now : null,
          updatedAt: now,
          ...(options.userId && { updatedBy: options.userId }),
        };

        // Calculate balance change
        // If marking as paid: Add amount to balance (credit)
        // If marking as unpaid: Remove amount from balance (debit)
        const balanceChange = paid ? currentPayment.amount : -currentPayment.amount;

        transaction.update(docRef, updateData);
        transaction.update(playerRef, { balance: increment(balanceChange) });

        return { ...currentPayment, ...updateData };
      });

      return {
        success: true,
        data: updatedPayment,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }
}

/**
 * Hook to get the PaymentsService instance for a specific user
 *
 * @param userId User ID to get payments service for
 * @returns PaymentsService instance or null if userId not provided
 * @example
 * const paymentsService = usePaymentsService(playerId);
 * if (paymentsService) {
 *   await paymentsService.createPayment({ reason: 'Membership', amount: 50, ... });
 * }
 */
export function usePaymentsService(
  teamId: string | null | undefined,
  playerId: string | null | undefined
): PaymentsService | null {
  const firebase = useFirebaseOptional();

  return useMemo(() => {
    if (!teamId || !playerId || !firebase?.firestore) return null;
    return new PaymentsService(firebase.firestore, teamId, playerId);
  }, [firebase?.firestore, teamId, playerId]);
}

/**
 * Hook to subscribe to a player's payments in real-time
 *
 * @param userId User ID to fetch payments for
 * @returns Hook result with payments array, loading state, and error
 * @example
 * const { data: payments, isLoading, error } = usePlayerPayments(playerId);
 */
export function usePlayerPayments(teamId: string | null | undefined, playerId: string | null | undefined) {
  const firebase = useFirebaseOptional();

  const paymentsQuery = useMemoFirebase(() => {
    if (!teamId || !playerId || !firebase?.firestore) return null;
    const paymentsCol = collection(firebase.firestore, `teams/${teamId}/players/${playerId}/payments`);
    return query(paymentsCol, orderBy('date', 'desc'));
  }, [firebase?.firestore, teamId, playerId]);

  return useCollection<Payment>(paymentsQuery);
}
