/**
 * BalanceService - Manages balance calculations
 * Provides utilities for calculating player balances dynamically
 *
 * CRITICAL BUSINESS LOGIC:
 * - Balance is NEVER stored in Firestore - always calculated dynamically
 * - Balance = Total Credits - Total Debits
 * - Credits = Sum of paid payments
 * - Debits = Sum of unpaid amounts from fines (regular + beverage) and dues
 * - Beverage debits are derived from fines with fineType='beverage'
 * - Supports partial payments via amountPaid field
 *
 * Balance Calculation Formula:
 * ```
 * Balance = Σ(paid payments) - Σ(unpaid regular fines) - Σ(unpaid dues) - Σ(unpaid beverage fines)
 *
 * For each fine/due:
 *   Unpaid Amount = total amount - (amountPaid || 0)
 * ```
 */

'use client';

import type { Player, Fine, Payment, DuePayment } from '@/lib/types';
import { isBeverageFine } from '@/lib/types';

/**
 * Payment status for a transaction
 */
export interface PaymentStatus {
  /** Whether the transaction is fully paid */
  isPaid: boolean;
  /** Amount that has been paid */
  amountPaid: number;
  /** Remaining amount to be paid */
  amountRemaining: number;
  /** Total amount of the transaction */
  totalAmount: number;
}

/**
 * Balance breakdown for a player
 */
export interface BalanceBreakdown {
  /** Total balance (credits - debits) */
  balance: number;
  /** Total credits from payments */
  totalCredits: number;
  /** Total debits from regular fines */
  totalFineDebits: number;
  /** Total debits from dues */
  totalDueDebits: number;
  /** Total debits from beverage fines */
  totalBeverageDebits: number;
  /** Combined total of all debits */
  totalDebits: number;
}

/**
 * Calculate unpaid debit for a single fine-like item
 */
function calcUnpaidDebit(item: { paid: boolean; amount: number; amountPaid?: number | null }): number {
  if (item.paid) return 0;
  const amountPaid = item.amountPaid || 0;
  return Math.max(0, item.amount - amountPaid);
}

/**
 * Service class for balance calculations
 * Does not interact with Firestore - all calculations are in-memory
 *
 * Beverage debits are now derived from fines with fineType='beverage'
 * instead of from a separate beverageConsumptions array.
 */
export class BalanceService {
  /**
   * Calculate a player's balance dynamically from all transactions
   *
   * Balance = Credits (Payments) - Debits (Unpaid Fines/Dues)
   * Beverage debits are derived from fines with fineType='beverage'
   *
   * @param playerId Player ID to calculate balance for
   * @param payments All payments to consider
   * @param fines All fines to consider (includes both regular and beverage fines)
   * @param duePayments All due payments to consider
   * @returns Calculated balance
   */
  calculatePlayerBalance(
    playerId: string,
    payments: Payment[] = [],
    fines: Fine[] = [],
    duePayments: DuePayment[] = [],
  ): number {
    const breakdown = this.calculatePlayerBalanceBreakdown(playerId, payments, fines, duePayments);
    return breakdown.balance;
  }

  /**
   * Calculate a player's balance with detailed breakdown
   * Splits fines internally by fineType for the breakdown (fines vs beverages)
   *
   * @param playerId Player ID to calculate balance for
   * @param payments All payments to consider
   * @param fines All fines to consider (includes both regular and beverage fines)
   * @param duePayments All due payments to consider
   * @returns Detailed balance breakdown
   */
  calculatePlayerBalanceBreakdown(
    playerId: string,
    payments: Payment[] = [],
    fines: Fine[] = [],
    duePayments: DuePayment[] = [],
  ): BalanceBreakdown {
    // Total credits from payments
    const totalCredits = payments
      .filter(p => p.userId === playerId && p.paid)
      .reduce((sum, p) => sum + p.amount, 0);

    // Split fines by type for the player
    const playerFines = fines.filter(f => f.userId === playerId);

    // Total debits from unpaid regular fines
    const totalFineDebits = playerFines
      .filter(f => !isBeverageFine(f))
      .reduce((sum, f) => sum + calcUnpaidDebit(f), 0);

    // Total debits from unpaid beverage fines
    const totalBeverageDebits = playerFines
      .filter(f => isBeverageFine(f))
      .reduce((sum, f) => sum + calcUnpaidDebit(f), 0);

    // Total debits from unpaid dues (or partially paid)
    const totalDueDebits = duePayments
      .filter(dp => dp.userId === playerId && !dp.exempt)
      .reduce((sum, dp) => {
        if (dp.paid) return sum;
        const amountPaid = dp.amountPaid || 0;
        const remaining = Math.max(0, dp.amountDue - amountPaid);
        return sum + remaining;
      }, 0);

    const totalDebits = totalFineDebits + totalDueDebits + totalBeverageDebits;
    const balance = totalCredits - totalDebits;

    return {
      balance,
      totalCredits,
      totalFineDebits,
      totalDueDebits,
      totalBeverageDebits,
      totalDebits,
    };
  }

  /**
   * Update all players with calculated balances
   *
   * @param players Array of players
   * @param payments All payments
   * @param fines All fines (includes regular + beverage)
   * @param duePayments All due payments
   * @returns Players with updated balance field
   */
  updatePlayersWithBalances(
    players: Player[],
    payments: Payment[] = [],
    fines: Fine[] = [],
    duePayments: DuePayment[] = [],
  ): Player[] {
    return players.map(player => ({
      ...player,
      balance: this.calculatePlayerBalance(
        player.id,
        payments,
        fines,
        duePayments,
      ),
    }));
  }

  /**
   * Get payment status for a transaction (fine, due, or beverage)
   *
   * @param totalAmount Total amount of the transaction
   * @param paid Whether the transaction is marked as paid
   * @param amountPaid Amount that has been paid (for partial payments)
   * @returns Payment status with breakdown
   */
  getPaymentStatus(
    totalAmount: number,
    paid: boolean,
    amountPaid?: number
  ): PaymentStatus {
    if (paid) {
      return {
        isPaid: true,
        amountPaid: totalAmount,
        amountRemaining: 0,
        totalAmount,
      };
    }

    const actualAmountPaid = amountPaid || 0;
    const remaining = totalAmount - actualAmountPaid;

    return {
      isPaid: false,
      amountPaid: actualAmountPaid,
      amountRemaining: remaining,
      totalAmount,
    };
  }

  /**
   * Calculate how much of a new fine would be auto-paid given current balance
   *
   * This implements the auto-payment logic used when creating fines
   *
   * @param fineAmount Amount of the new fine
   * @param currentBalance Player's current balance
   * @returns Object with paid status and amount that would be paid
   */
  calculateAutoPayment(
    fineAmount: number,
    currentBalance: number
  ): {
    paid: boolean;
    amountPaid: number | undefined;
  } {
    const hasFullCredit = currentBalance >= fineAmount;
    const hasPartialCredit = currentBalance > 0 && currentBalance < fineAmount;

    if (hasFullCredit) {
      return {
        paid: true,
        amountPaid: fineAmount,
      };
    } else if (hasPartialCredit) {
      return {
        paid: false,
        amountPaid: currentBalance,
      };
    } else {
      return {
        paid: false,
        amountPaid: undefined,
      };
    }
  }

  /**
   * Calculate total unpaid amount for a player
   *
   * @param playerId Player ID
   * @param fines All fines (includes regular + beverage)
   * @param duePayments All due payments
   * @returns Total unpaid amount (total debits)
   */
  calculateTotalUnpaid(
    playerId: string,
    fines: Fine[] = [],
    duePayments: DuePayment[] = [],
  ): number {
    const breakdown = this.calculatePlayerBalanceBreakdown(
      playerId,
      [], // No payments needed for unpaid calculation
      fines,
      duePayments,
    );

    return breakdown.totalDebits;
  }

  /**
   * Calculate total paid amount for a player
   *
   * @param playerId Player ID
   * @param payments All payments
   * @returns Total paid amount (total credits)
   */
  calculateTotalPaid(
    playerId: string,
    payments: Payment[] = []
  ): number {
    return payments
      .filter(p => p.userId === playerId && p.paid)
      .reduce((sum, p) => sum + p.amount, 0);
  }
}

/**
 * Singleton instance of BalanceService
 * Since it's stateless, we can use a single instance
 */
export const balanceService = new BalanceService();
