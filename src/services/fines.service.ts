/**
 * FinesService - Manages fines in Firestore
 * Handles CRUD operations for fines with auto-payment logic and real-time hooks
 *
 * CRITICAL BUSINESS LOGIC:
 * - Fines are stored in nested collections: /users/{userId}/fines/{fineId}
 * - Auto-payment logic applies player balance to new fines
 * - Supports partial payments via amountPaid field
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
import type { Fine } from '@/lib/types';
import { useMemoFirebase, useCollection } from '@/firebase';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Extended create options for fines
 */
interface FineCreateOptions extends CreateOptions {
  /** Player's current balance for auto-payment calculation */
  playerBalance?: number;
}

/**
 * Service class for managing fines
 * Provides fine-specific operations with auto-payment logic
 */
export class FinesService extends BaseFirebaseService<Fine> {
  constructor(firestore: Firestore, private userId: string) {
    super(firestore, `users/${userId}/fines`);
  }

  /**
   * Create a new fine with auto-payment logic
   *
   * Auto-payment logic:
   * - If playerBalance >= amount: mark as paid, set amountPaid = amount
   * - If 0 < playerBalance < amount: mark as unpaid, set amountPaid = playerBalance (partial)
   * - If playerBalance <= 0: mark as unpaid, amountPaid = undefined
   *
   * @param fineData Fine data without id, createdAt, updatedAt, paid, amountPaid
   * @param options Create options including playerBalance for auto-payment
   * @returns Service result with created fine
   */
  async createFine(
    fineData: Omit<Fine, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt' | 'amountPaid'>,
    options: FineCreateOptions = {}
  ): Promise<ServiceResult<Fine>> {
    try {
      const id = options.customId || this.generateId();
      const now = this.timestamp();
      const { playerBalance = 0 } = options;

      // Apply auto-payment logic
      const hasFullCredit = playerBalance >= fineData.amount;
      const hasPartialCredit = playerBalance > 0 && playerBalance < fineData.amount;

      let paid = false;
      let paidAt: string | undefined = undefined;
      let amountPaid: number | undefined = undefined;

      if (hasFullCredit) {
        // Full payment
        paid = true;
        paidAt = now;
        amountPaid = fineData.amount;
      } else if (hasPartialCredit) {
        // Partial payment
        paid = false;
        amountPaid = playerBalance;
      }
      // else: no payment (paid=false, amountPaid=undefined)

      const fullData = {
        ...fineData,
        id,
        paid,
        paidAt,
        amountPaid,
        createdAt: now,
        updatedAt: now,
        ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
      } as Fine;

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
   * Create a new fine with auto-payment logic (non-blocking)
   *
   * @param fineData Fine data without id, createdAt, updatedAt, paid, amountPaid
   * @param options Create options including playerBalance for auto-payment
   * @returns Fine ID
   */
  createFineNonBlocking(
    fineData: Omit<Fine, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt' | 'amountPaid'>,
    options: FineCreateOptions = {}
  ): string {
    const id = options.customId || this.generateId();
    const now = this.timestamp();
    const { playerBalance = 0 } = options;

    // Apply auto-payment logic
    const hasFullCredit = playerBalance >= fineData.amount;
    const hasPartialCredit = playerBalance > 0 && playerBalance < fineData.amount;

    let paid = false;
    let paidAt: string | undefined = undefined;
    let amountPaid: number | undefined = undefined;

    if (hasFullCredit) {
      paid = true;
      paidAt = now;
      amountPaid = fineData.amount;
    } else if (hasPartialCredit) {
      paid = false;
      amountPaid = playerBalance;
    }

    const fullData = {
      ...fineData,
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
   * Update fine payment status (use with transactions for consistency)
   *
   * @param fineId Fine ID
   * @param additionalPayment Additional payment amount to apply
   * @param options Update options
   * @returns Service result with updated fine
   */
  async updateFinePayment(
    fineId: string,
    additionalPayment: number,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<Fine>> {
    try {
      const docRef = this.getDocRef(fineId);
      const now = this.timestamp();

      const updatedFine = await runTransaction(this.firestore, async (transaction) => {
        const fineDoc = await transaction.get(docRef);

        if (!fineDoc.exists()) {
          throw new Error('Fine not found');
        }

        const currentFine = fineDoc.data() as Fine;
        const currentAmountPaid = currentFine.amountPaid || 0;
        const newAmountPaid = currentAmountPaid + additionalPayment;
        const isPaid = newAmountPaid >= currentFine.amount;

        const updateData = {
          amountPaid: newAmountPaid,
          paid: isPaid,
          paidAt: isPaid ? now : currentFine.paidAt,
          updatedAt: now,
          ...(options.userId && { updatedBy: options.userId }),
        };

        transaction.update(docRef, updateData);

        return { ...currentFine, ...updateData };
      });

      return {
        success: true,
        data: updatedFine,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Toggle fine paid status (mark as paid/unpaid)
   *
   * @param fineId Fine ID
   * @param paid New paid status
   * @param options Update options
   * @returns Service result with updated fine
   */
  async toggleFinePaid(
    fineId: string,
    paid: boolean,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<Fine>> {
    try {
      const docRef = this.getDocRef(fineId);
      const now = this.timestamp();

      const updatedFine = await runTransaction(this.firestore, async (transaction) => {
        const fineDoc = await transaction.get(docRef);

        if (!fineDoc.exists()) {
          throw new Error('Fine not found');
        }

        const currentFine = fineDoc.data() as Fine;

        const updateData = {
          paid,
          paidAt: paid ? now : null,
          amountPaid: paid ? currentFine.amount : (currentFine.amountPaid || null),
          updatedAt: now,
          ...(options.userId && { updatedBy: options.userId }),
        };

        transaction.update(docRef, updateData);

        return { ...currentFine, ...updateData };
      });

      return {
        success: true,
        data: updatedFine,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Toggle fine paid status (non-blocking)
   *
   * @param fineId Fine ID
   * @param paid New paid status
   * @param options Update options
   */
  toggleFinePaidNonBlocking(
    fineId: string,
    paid: boolean,
    options: UpdateOptions = {}
  ): void {
    const now = this.timestamp();
    const docRef = this.getDocRef(fineId);

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
   * Update an existing fine
   *
   * @param fineId Fine ID
   * @param fineData Partial fine data to update
   * @param options Update options
   * @returns Service result with updated fine
   */
  async updateFine(
    fineId: string,
    fineData: Partial<Omit<Fine, 'id'>>,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<Fine>> {
    return this.update(fineId, fineData as any, options);
  }

  /**
   * Update an existing fine (non-blocking)
   *
   * @param fineId Fine ID
   * @param fineData Partial fine data to update
   * @param options Update options
   */
  updateFineNonBlocking(
    fineId: string,
    fineData: Partial<Omit<Fine, 'id'>>,
    options: UpdateOptions = {}
  ): void {
    const now = this.timestamp();
    const updateData = {
      ...fineData,
      updatedAt: now,
      ...(options.userId && { updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(fineId);
    updateDocumentNonBlocking(docRef, updateData);
  }

  /**
   * Delete a fine
   *
   * @param fineId Fine ID
   * @param options Delete options
   * @returns Service result indicating success or failure
   */
  async deleteFine(
    fineId: string,
    options: DeleteOptions = {}
  ): Promise<ServiceResult<void>> {
    return this.delete(fineId, options);
  }

  /**
   * Delete a fine (non-blocking)
   *
   * @param fineId Fine ID
   * @param options Delete options
   */
  deleteFineNonBlocking(
    fineId: string,
    options: DeleteOptions = {}
  ): void {
    if (options.soft) {
      this.updateFineNonBlocking(fineId, {
        deleted: true,
        deletedAt: this.timestamp(),
        ...(options.userId && { deletedBy: options.userId }),
      } as any);
    } else {
      const docRef = this.getDocRef(fineId);
      deleteDocumentNonBlocking(docRef);
    }
  }

  /**
   * Get reference to a fine document
   *
   * @param fineId Fine ID
   * @returns DocumentReference for the fine
   */
  getFineRef(fineId: string): DocumentReference {
    return doc(this.firestore, `users/${this.userId}/fines`, fineId);
  }

  /**
   * Get reference to the fines collection for a user
   *
   * @returns CollectionReference for user's fines
   */
  getFinesCollectionRef(): CollectionReference {
    return collection(this.firestore, `users/${this.userId}/fines`);
  }
}

/**
 * Hook to get the FinesService instance for a specific user
 *
 * @param userId User ID to get fines service for
 * @returns FinesService instance or null if userId not provided
 * @example
 * const finesService = useFinesService(playerId);
 * if (finesService) {
 *   await finesService.createFine({ reason: 'Late', amount: 5, ... });
 * }
 */
export function useFinesService(userId: string | null | undefined): FinesService | null {
  const firebase = useFirebaseOptional();

  return useMemo(() => {
    if (!userId || !firebase?.firestore) return null;
    return new FinesService(firebase.firestore, userId);
  }, [firebase?.firestore, userId]);
}

/**
 * Hook to subscribe to a player's fines in real-time
 *
 * @param userId User ID to fetch fines for
 * @returns Hook result with fines array, loading state, and error
 * @example
 * const { data: fines, isLoading, error } = usePlayerFines(playerId);
 */
export function usePlayerFines(userId: string | null | undefined) {
  const firebase = useFirebaseOptional();

  const finesQuery = useMemoFirebase(() => {
    if (!userId || !firebase?.firestore) return null;
    const finesCol = collection(firebase.firestore, `users/${userId}/fines`);
    return query(finesCol, orderBy('date', 'desc'));
  }, [firebase?.firestore, userId]);

  return useCollection<Fine>(finesQuery);
}
