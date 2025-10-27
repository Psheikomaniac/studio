/**
 * PaymentsService - Manages payments in Firestore
 * Handles CRUD operations for payments with real-time hooks
 *
 * CRITICAL BUSINESS LOGIC:
 * - Payments are stored in nested collections: /users/{userId}/payments/{paymentId}
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
  type Firestore,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { useMemo } from 'react';
import { BaseFirebaseService } from './base.service';
import type { ServiceResult, CreateOptions, UpdateOptions, DeleteOptions } from './types';
import type { Payment } from '@/lib/types';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Service class for managing payments
 * Provides payment-specific operations
 */
export class PaymentsService extends BaseFirebaseService<Payment> {
  constructor(firestore: Firestore, private userId: string) {
    super(firestore, `users/${userId}/payments`);
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
        id,
        paid: true, // Payments are always paid (they are credits)
        paidAt: now,
        createdAt: now,
        updatedAt: now,
        ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
      } as Payment;

      const docRef = this.getDocRef(id);
      await runTransaction(this.firestore, async (transaction) => {
        transaction.set(docRef, fullData);
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
    return this.update(paymentId, paymentData as any, options);
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
    return this.delete(paymentId, options);
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
    return doc(this.firestore, `users/${this.userId}/payments`, paymentId);
  }

  /**
   * Get reference to the payments collection for a user
   *
   * @returns CollectionReference for user's payments
   */
  getPaymentsCollectionRef(): CollectionReference {
    return collection(this.firestore, `users/${this.userId}/payments`);
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
export function usePaymentsService(userId: string | null | undefined): PaymentsService | null {
  const firestore = useFirestore();

  return useMemo(() => {
    if (!userId) return null;
    return new PaymentsService(firestore, userId);
  }, [firestore, userId]);
}

/**
 * Hook to subscribe to a player's payments in real-time
 *
 * @param userId User ID to fetch payments for
 * @returns Hook result with payments array, loading state, and error
 * @example
 * const { data: payments, isLoading, error } = usePlayerPayments(playerId);
 */
export function usePlayerPayments(userId: string | null | undefined) {
  const firestore = useFirestore();

  const paymentsQuery = useMemoFirebase(() => {
    if (!userId) return null;
    const paymentsCol = collection(firestore, `users/${userId}/payments`);
    return query(paymentsCol, orderBy('date', 'desc'));
  }, [firestore, userId]);

  return useCollection<Payment>(paymentsQuery);
}
