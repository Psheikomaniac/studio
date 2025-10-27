/**
 * Test Data Generators
 * Provides factory functions for creating test data fixtures
 */

import type { Player, Fine, Payment, DuePayment, BeverageConsumption } from '@/lib/types';

/**
 * Generate a test player with optional overrides
 */
export function generatePlayer(overrides?: Partial<Player>): Player {
  const id = overrides?.id || `player-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: 'Test Player',
    nickname: 'Testy',
    photoUrl: 'https://example.com/photo.jpg',
    balance: 0,
    email: 'test@example.com',
    phone: '+1234567890',
    totalUnpaidPenalties: 0,
    totalPaidPenalties: 0,
    ...overrides,
  };
}

/**
 * Generate a test fine with optional overrides
 */
export function generateFine(overrides?: Partial<Fine>): Fine {
  const id = overrides?.id || `fine-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    userId: 'player-1',
    reason: 'Late to practice',
    amount: 10,
    date: now,
    paid: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Generate a test payment with optional overrides
 */
export function generatePayment(overrides?: Partial<Payment>): Payment {
  const id = overrides?.id || `payment-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    userId: 'player-1',
    reason: 'Season payment',
    amount: 100,
    date: now,
    paid: true,
    paidAt: now,
    ...overrides,
  };
}

/**
 * Generate a test due payment with optional overrides
 */
export function generateDuePayment(overrides?: Partial<DuePayment>): DuePayment {
  const id = overrides?.id || `due-payment-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    dueId: 'due-1',
    userId: 'player-1',
    userName: 'Test Player',
    amountDue: 50,
    paid: false,
    exempt: false,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Generate a test beverage consumption with optional overrides
 */
export function generateBeverageConsumption(overrides?: Partial<BeverageConsumption>): BeverageConsumption {
  const id = overrides?.id || `beverage-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    userId: 'player-1',
    beverageId: 'bev-1',
    beverageName: 'Beer',
    amount: 5,
    date: now,
    paid: false,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Generate multiple test players
 */
export function generatePlayers(count: number, overrides?: Partial<Player>): Player[] {
  return Array.from({ length: count }, (_, index) =>
    generatePlayer({ ...overrides, id: `player-${index + 1}` })
  );
}

/**
 * Generate multiple test fines
 */
export function generateFines(count: number, overrides?: Partial<Fine>): Fine[] {
  return Array.from({ length: count }, (_, index) =>
    generateFine({ ...overrides, id: `fine-${index + 1}` })
  );
}

/**
 * Generate multiple test payments
 */
export function generatePayments(count: number, overrides?: Partial<Payment>): Payment[] {
  return Array.from({ length: count }, (_, index) =>
    generatePayment({ ...overrides, id: `payment-${index + 1}` })
  );
}
