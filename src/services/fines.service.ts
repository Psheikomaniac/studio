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
  increment,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { useMemo } from 'react';
import { BaseFirebaseService } from './base.service';
import type { ServiceResult, CreateOptions, UpdateOptions, DeleteOptions } from './types';
import type { Fine, Beverage } from '@/lib/types';
import { useMemoFirebase, useCollection } from '@/firebase';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';

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
  constructor(
    firestore: Firestore,
    private teamId: string,
    private playerId: string
  ) {
    super(firestore, `teams/${teamId}/players/${playerId}/fines`);
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
        userId: this.playerId,
        teamId: this.teamId,
        id,
        paid,
        paidAt,
        amountPaid,
        createdAt: now,
        updatedAt: now,
        ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
      } as Fine;

      const docRef = this.getDocRef(id);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);

      await runTransaction(this.firestore, async (transaction) => {
        transaction.set(docRef, fullData);
        transaction.update(playerRef, { balance: increment(-fullData.amount) });
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
   * Create a beverage fine — convenience wrapper around createFine
   * Maps beverage catalog data to Fine fields with fineType='beverage'
   *
   * @param beverage Beverage catalog item (name + price)
   * @param date ISO date string for when the consumption occurred
   * @param options Create options including playerBalance for auto-payment
   * @returns Service result with created fine
   */
  async createBeverageFine(
    beverage: Pick<Beverage, 'id' | 'name' | 'price'>,
    date: string,
    options: FineCreateOptions = {}
  ): Promise<ServiceResult<Fine>> {
    return this.createFine(
      {
        userId: this.playerId, // overridden by createFine, kept for type satisfaction
        reason: beverage.name,
        amount: beverage.price,
        date,
        fineType: 'beverage',
        beverageId: beverage.id,
      },
      options
    );
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
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);
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

        // Calculate balance change
        const oldDebit = currentFine.paid ? 0 : (currentFine.amount - (currentFine.amountPaid || 0));
        const newAmountPaid = updateData.amountPaid || 0;
        const newDebit = paid ? 0 : (currentFine.amount - newAmountPaid);
        const balanceChange = oldDebit - newDebit;

        transaction.update(docRef, updateData);
        
        if (balanceChange !== 0) {
          transaction.update(playerRef, { balance: increment(balanceChange) });
        }

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
   * Delete a fine with transactional balance restore
   * Reads the fine amount and restores it to the player's balance atomically
   *
   * @param fineId Fine ID
   * @param _options Delete options (unused, kept for API compatibility)
   * @returns Service result indicating success or failure
   */
  async deleteFine(
    fineId: string,
    _options: DeleteOptions = {}
  ): Promise<ServiceResult<void>> {
    try {
      const docRef = this.getDocRef(fineId);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);

      await runTransaction(this.firestore, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error('Fine not found');
        }
        const fine = docSnap.data() as Fine;

        // Only restore the outstanding (unpaid) portion to balance
        const outstanding = fine.amount - (fine.amountPaid ?? 0);

        transaction.delete(docRef);
        if (outstanding !== 0) {
          transaction.update(playerRef, { balance: increment(outstanding) });
        }
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get reference to a fine document
   *
   * @param fineId Fine ID
   * @returns DocumentReference for the fine
   */
  getFineRef(fineId: string): DocumentReference {
    return doc(this.firestore, 'teams', this.teamId, 'players', this.playerId, 'fines', fineId);
  }

  /**
   * Get reference to the fines collection for a user
   *
   * @returns CollectionReference for user's fines
   */
  getFinesCollectionRef(): CollectionReference {
    return collection(this.firestore, `teams/${this.teamId}/players/${this.playerId}/fines`);
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
export function useFinesService(
  teamId: string | null | undefined,
  playerId: string | null | undefined
): FinesService | null {
  const firebase = useFirebaseOptional();

  return useMemo(() => {
    if (!teamId || !playerId || !firebase?.firestore) return null;
    return new FinesService(firebase.firestore, teamId, playerId);
  }, [firebase?.firestore, teamId, playerId]);
}

/**
 * Hook to subscribe to a player's fines in real-time
 *
 * @param userId User ID to fetch fines for
 * @returns Hook result with fines array, loading state, and error
 * @example
 * const { data: fines, isLoading, error } = usePlayerFines(playerId);
 */
export function usePlayerFines(teamId: string | null | undefined, playerId: string | null | undefined) {
  const firebase = useFirebaseOptional();

  const finesQuery = useMemoFirebase(() => {
    if (!teamId || !playerId || !firebase?.firestore) return null;
    const finesCol = collection(firebase.firestore, `teams/${teamId}/players/${playerId}/fines`);
    return query(finesCol, orderBy('date', 'desc'));
  }, [firebase?.firestore, teamId, playerId]);

  return useCollection<Fine>(finesQuery);
}
