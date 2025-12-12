/**
 * BeveragesService - Manages beverage consumptions in Firestore
 * Handles CRUD operations for beverage consumption with auto-payment logic and real-time hooks
 *
 * CRITICAL BUSINESS LOGIC:
 * - Beverage consumptions are stored in nested collections: /teams/{teamId}/players/{playerId}/beverageConsumptions/{consumptionId}
 * - Auto-payment logic applies player balance to new consumptions
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
import type { BeverageConsumption } from '@/lib/types';
import { useMemoFirebase, useCollection } from '@/firebase';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Extended create options for beverage consumptions
 */
interface ConsumptionCreateOptions extends CreateOptions {
  /** Player's current balance for auto-payment calculation */
  playerBalance?: number;
}

/**
 * Service class for managing beverage consumptions
 * Provides consumption-specific operations with auto-payment logic
 */
export class BeveragesService extends BaseFirebaseService<BeverageConsumption> {
  constructor(
    firestore: Firestore,
    private teamId: string,
    private playerId: string
  ) {
    super(firestore, `teams/${teamId}/players/${playerId}/beverageConsumptions`);
  }

  /**
   * Create a new beverage consumption with auto-payment logic
   *
   * Auto-payment logic:
   * - If playerBalance >= amount: mark as paid, set amountPaid = amount
   * - If 0 < playerBalance < amount: mark as unpaid, set amountPaid = playerBalance (partial)
   * - If playerBalance <= 0: mark as unpaid, amountPaid = undefined
   *
   * @param consumptionData Consumption data without id, createdAt, paid, amountPaid
   * @param options Create options including playerBalance for auto-payment
   * @returns Service result with created consumption
   */
  async createConsumption(
    consumptionData: Omit<BeverageConsumption, 'id' | 'createdAt' | 'paid' | 'paidAt' | 'amountPaid'>,
    options: ConsumptionCreateOptions = {}
  ): Promise<ServiceResult<BeverageConsumption>> {
    try {
      const id = options.customId || this.generateId();
      const now = this.timestamp();
      const { playerBalance = 0 } = options;

      // Apply auto-payment logic
      const hasFullCredit = playerBalance >= consumptionData.amount;
      const hasPartialCredit = playerBalance > 0 && playerBalance < consumptionData.amount;

      let paid = false;
      let paidAt: string | undefined = undefined;
      let amountPaid: number | undefined = undefined;

      if (hasFullCredit) {
        // Full payment
        paid = true;
        paidAt = now;
        amountPaid = consumptionData.amount;
      } else if (hasPartialCredit) {
        // Partial payment
        paid = false;
        amountPaid = playerBalance;
      }
      // else: no payment (paid=false, amountPaid=undefined)

      const fullData = {
        ...consumptionData,
        userId: this.playerId,
        teamId: this.teamId,
        id,
        paid,
        paidAt,
        amountPaid,
        createdAt: now,
        ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
      } as BeverageConsumption;

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
   * Create a new beverage consumption with auto-payment logic (non-blocking)
   *
   * @param consumptionData Consumption data without id, createdAt, paid, amountPaid
   * @param options Create options including playerBalance for auto-payment
   * @returns Consumption ID
   */
  createConsumptionNonBlocking(
    consumptionData: Omit<BeverageConsumption, 'id' | 'createdAt' | 'paid' | 'paidAt' | 'amountPaid'>,
    options: ConsumptionCreateOptions = {}
  ): string {
    const id = options.customId || this.generateId();
    const now = this.timestamp();
    const { playerBalance = 0 } = options;

    // Apply auto-payment logic
    const hasFullCredit = playerBalance >= consumptionData.amount;
    const hasPartialCredit = playerBalance > 0 && playerBalance < consumptionData.amount;

    let paid = false;
    let paidAt: string | undefined = undefined;
    let amountPaid: number | undefined = undefined;

    if (hasFullCredit) {
      paid = true;
      paidAt = now;
      amountPaid = consumptionData.amount;
    } else if (hasPartialCredit) {
      paid = false;
      amountPaid = playerBalance;
    }

    const fullData = {
      ...consumptionData,
      userId: this.playerId,
      teamId: this.teamId,
      id,
      paid,
      paidAt,
      amountPaid,
      createdAt: now,
      ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(id);
    setDocumentNonBlocking(docRef, fullData, {});

    return id;
  }

  /**
   * Update consumption payment status (use with transactions for consistency)
   *
   * @param consumptionId Consumption ID
   * @param additionalPayment Additional payment amount to apply
   * @param options Update options
   * @returns Service result with updated consumption
   */
  async updateConsumptionPayment(
    consumptionId: string,
    additionalPayment: number,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<BeverageConsumption>> {
    try {
      const docRef = this.getDocRef(consumptionId);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);
      const now = this.timestamp();

      const updatedConsumption = await runTransaction(this.firestore, async (transaction) => {
        const consumptionDoc = await transaction.get(docRef);

        if (!consumptionDoc.exists()) {
          throw new Error('Beverage consumption not found');
        }

        const currentConsumption = consumptionDoc.data() as BeverageConsumption;
        const currentAmountPaid = currentConsumption.amountPaid || 0;
        const newAmountPaid = currentAmountPaid + additionalPayment;
        const isPaid = newAmountPaid >= currentConsumption.amount;

        const updateData = {
          amountPaid: newAmountPaid,
          paid: isPaid,
          paidAt: isPaid ? now : currentConsumption.paidAt,
          ...(options.userId && { updatedBy: options.userId }),
        };

        transaction.update(docRef, updateData);
        transaction.update(playerRef, { balance: increment(additionalPayment) });

        return { ...currentConsumption, ...updateData };
      });

      return {
        success: true,
        data: updatedConsumption,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Toggle consumption paid status (mark as paid/unpaid)
   *
   * @param consumptionId Consumption ID
   * @param paid New paid status
   * @param options Update options
   * @returns Service result with updated consumption
   */
  async toggleConsumptionPaid(
    consumptionId: string,
    paid: boolean,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<BeverageConsumption>> {
    try {
      const docRef = this.getDocRef(consumptionId);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);
      const now = this.timestamp();

      const updatedConsumption = await runTransaction(this.firestore, async (transaction) => {
        const consumptionDoc = await transaction.get(docRef);

        if (!consumptionDoc.exists()) {
          throw new Error('Beverage consumption not found');
        }

        const currentConsumption = consumptionDoc.data() as BeverageConsumption;

        const updateData = {
          paid,
          paidAt: paid ? now : null,
          amountPaid: paid ? currentConsumption.amount : (currentConsumption.amountPaid || null),
          ...(options.userId && { updatedBy: options.userId }),
        };
        
        const oldDebit = currentConsumption.paid ? 0 : (currentConsumption.amount - (currentConsumption.amountPaid || 0));
        const newAmountPaid = updateData.amountPaid || 0;
        const newDebit = paid ? 0 : (currentConsumption.amount - newAmountPaid);
        const balanceChange = oldDebit - newDebit;

        transaction.update(docRef, updateData);
        if (balanceChange !== 0) {
             transaction.update(playerRef, { balance: increment(balanceChange) });
        }

        return { ...currentConsumption, ...updateData };
      });

      return {
        success: true,
        data: updatedConsumption,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Toggle consumption paid status (non-blocking)
   *
   * @param consumptionId Consumption ID
   * @param paid New paid status
   * @param options Update options
   */
  toggleConsumptionPaidNonBlocking(
    consumptionId: string,
    paid: boolean,
    options: UpdateOptions = {}
  ): void {
    const now = this.timestamp();
    const docRef = this.getDocRef(consumptionId);

    // Note: This is non-blocking and doesn't fetch current state
    // Use with caution - prefer the transactional version
    updateDocumentNonBlocking(docRef, {
      paid,
      paidAt: paid ? now : null,
      ...(options.userId && { updatedBy: options.userId }),
    });
  }

  /**
   * Update an existing consumption
   *
   * @param consumptionId Consumption ID
   * @param consumptionData Partial consumption data to update
   * @param options Update options
   * @returns Service result with updated consumption
   */
  async updateConsumption(
    consumptionId: string,
    consumptionData: Partial<Omit<BeverageConsumption, 'id'>>,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<BeverageConsumption>> {
    return this.update(consumptionId, consumptionData as any, options);
  }

  /**
   * Update an existing consumption (non-blocking)
   *
   * @param consumptionId Consumption ID
   * @param consumptionData Partial consumption data to update
   * @param options Update options
   */
  updateConsumptionNonBlocking(
    consumptionId: string,
    consumptionData: Partial<Omit<BeverageConsumption, 'id'>>,
    options: UpdateOptions = {}
  ): void {
    const now = this.timestamp();
    const updateData = {
      ...consumptionData,
      ...(options.userId && { updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(consumptionId);
    updateDocumentNonBlocking(docRef, updateData);
  }

  /**
   * Delete a consumption
   *
   * @param consumptionId Consumption ID
   * @param options Delete options
   * @returns Service result indicating success or failure
   */
  async deleteConsumption(
    consumptionId: string,
    options: DeleteOptions = {}
  ): Promise<ServiceResult<void>> {
    try {
      const docRef = this.getDocRef(consumptionId);
      const playerRef = doc(this.firestore, 'teams', this.teamId, 'players', this.playerId);

      await runTransaction(this.firestore, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
             throw new Error('Beverage consumption not found');
        }
        const consumption = docSnap.data() as BeverageConsumption;
        
        transaction.delete(docRef);
        transaction.update(playerRef, { balance: increment(consumption.amount) });
      });
      
      return { success: true, data: undefined };
    } catch (error) {
        return { success: false, error: error as Error };
    }
  }

  /**
   * Delete a consumption (non-blocking)
   *
   * @param consumptionId Consumption ID
   * @param options Delete options
   */
  deleteConsumptionNonBlocking(
    consumptionId: string,
    options: DeleteOptions = {}
  ): void {
    if (options.soft) {
      this.updateConsumptionNonBlocking(consumptionId, {
        deleted: true,
        deletedAt: this.timestamp(),
        ...(options.userId && { deletedBy: options.userId }),
      } as any);
    } else {
      const docRef = this.getDocRef(consumptionId);
      deleteDocumentNonBlocking(docRef);
    }
  }

  /**
   * Get reference to a consumption document
   *
   * @param consumptionId Consumption ID
   * @returns DocumentReference for the consumption
   */
  getConsumptionRef(consumptionId: string): DocumentReference {
    return doc(this.firestore, 'teams', this.teamId, 'players', this.playerId, 'beverageConsumptions', consumptionId);
  }

  /**
   * Get reference to the consumptions collection for a user
   *
   * @returns CollectionReference for user's consumptions
   */
  getConsumptionsCollectionRef(): CollectionReference {
    return collection(this.firestore, `teams/${this.teamId}/players/${this.playerId}/beverageConsumptions`);
  }
}

/**
 * Hook to get the BeveragesService instance for a specific user
 *
 * @param userId User ID to get beverages service for
 * @returns BeveragesService instance or null if userId not provided
 * @example
 * const beveragesService = useBeveragesService(playerId);
 * if (beveragesService) {
 *   await beveragesService.createConsumption({ beverageId: 'beer1', amount: 2.5, ... });
 * }
 */
export function useBeveragesService(
  teamId: string | null | undefined,
  playerId: string | null | undefined
): BeveragesService | null {
  const firebase = useFirebaseOptional();

  return useMemo(() => {
    if (!teamId || !playerId || !firebase?.firestore) return null;
    return new BeveragesService(firebase.firestore, teamId, playerId);
  }, [firebase?.firestore, teamId, playerId]);
}

/**
 * Hook to subscribe to a player's beverage consumptions in real-time
 *
 * @param userId User ID to fetch consumptions for
 * @returns Hook result with consumptions array, loading state, and error
 * @example
 * const { data: consumptions, isLoading, error } = usePlayerConsumptions(playerId);
 */
export function usePlayerConsumptions(teamId: string | null | undefined, playerId: string | null | undefined) {
  const firebase = useFirebaseOptional();

  const consumptionsQuery = useMemoFirebase(() => {
    if (!teamId || !playerId || !firebase?.firestore) return null;
    const consumptionsCol = collection(firebase.firestore, `teams/${teamId}/players/${playerId}/beverageConsumptions`);
    return query(consumptionsCol, orderBy('date', 'desc'));
  }, [firebase?.firestore, teamId, playerId]);

  return useCollection<BeverageConsumption>(consumptionsQuery);
}
