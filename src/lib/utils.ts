import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Player, Fine, Payment, DuePayment, PaymentCategory } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate a player's balance dynamically from all transactions
 * Balance = Credits (Payments) - Debits (Unpaid Fines/Dues)
 * Beverage debits are derived from fines with fineType='beverage'
 */
export function calculatePlayerBalance(
  playerId: string,
  payments: Payment[],
  fines: Fine[],
  duePayments: DuePayment[]
): number {
  // Total credits from payments
  const totalCredits = payments
    .filter(p => {
      if (p.userId !== playerId) return false;

      // Category Logic: DEPOSIT and PAYMENT are always credits
      if (p.category === PaymentCategory.DEPOSIT || p.category === PaymentCategory.PAYMENT) {
        return true;
      }

      // Legacy/Default Logic: Paid payments are credits
      if (p.paid) return true;

      return false;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  // Total debits from unpaid fines — all types (regular + beverage)
  const totalFineDebits = fines
    .filter(f => f.userId === playerId)
    .reduce((sum, f) => {
      if (f.paid) return sum; // Fully paid, no debit
      const amountPaid = f.amountPaid || 0;
      const remaining = Math.max(0, f.amount - amountPaid);
      return sum + remaining;
    }, 0);

  // Total debits from unpaid dues (or partially paid)
  const totalDueDebits = duePayments
    .filter(dp => dp.userId === playerId && !dp.exempt)
    .reduce((sum, dp) => {
      if (dp.paid) return sum; // Fully paid, no debit
      const amountPaid = dp.amountPaid || 0;
      const remaining = Math.max(0, dp.amountDue - amountPaid);
      return sum + remaining;
    }, 0);

  return totalCredits - totalFineDebits - totalDueDebits;
}

/**
 * Update all players with calculated balances
 */
export function updatePlayersWithCalculatedBalances(
  players: Player[],
  payments: Payment[],
  fines: Fine[],
  duePayments: DuePayment[]
): Player[] {
  return players.map(player => ({
    ...player,
    balance: calculatePlayerBalance(player.id, payments, fines, duePayments)
  }));
}

export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
