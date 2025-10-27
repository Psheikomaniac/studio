import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Player, Fine, Payment, DuePayment, BeverageConsumption } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate a player's balance dynamically from all transactions
 * Balance = Credits (Payments) - Debits (Unpaid Fines/Dues/Beverages)
 */
export function calculatePlayerBalance(
  playerId: string,
  payments: Payment[],
  fines: Fine[],
  duePayments: DuePayment[],
  beverageConsumptions: BeverageConsumption[]
): number {
  // Total credits from payments
  const totalCredits = payments
    .filter(p => p.userId === playerId && p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  // Total debits from unpaid fines (or partially paid)
  const totalFineDebits = fines
    .filter(f => f.userId === playerId)
    .reduce((sum, f) => {
      if (f.paid) return sum; // Fully paid, no debit
      const amountPaid = f.amountPaid || 0;
      const remaining = f.amount - amountPaid;
      return sum + remaining;
    }, 0);

  // Total debits from unpaid dues (or partially paid)
  const totalDueDebits = duePayments
    .filter(dp => dp.userId === playerId && !dp.exempt)
    .reduce((sum, dp) => {
      if (dp.paid) return sum; // Fully paid, no debit
      const amountPaid = dp.amountPaid || 0;
      const remaining = dp.amountDue - amountPaid;
      return sum + remaining;
    }, 0);

  // Total debits from unpaid beverages (or partially paid)
  const totalBeverageDebits = beverageConsumptions
    .filter(bc => bc.userId === playerId)
    .reduce((sum, bc) => {
      if (bc.paid) return sum; // Fully paid, no debit
      const amountPaid = bc.amountPaid || 0;
      const remaining = bc.amount - amountPaid;
      return sum + remaining;
    }, 0);

  return totalCredits - totalFineDebits - totalDueDebits - totalBeverageDebits;
}

/**
 * Update all players with calculated balances
 */
export function updatePlayersWithCalculatedBalances(
  players: Player[],
  payments: Payment[],
  fines: Fine[],
  duePayments: DuePayment[],
  beverageConsumptions: BeverageConsumption[]
): Player[] {
  return players.map(player => ({
    ...player,
    balance: calculatePlayerBalance(player.id, payments, fines, duePayments, beverageConsumptions)
  }));
}
