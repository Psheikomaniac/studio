import { describe, it, expect } from 'vitest';
import { calculatePlayerBalance } from '@/lib/utils';
import { PaymentCategory } from '@/lib/types';
import { generatePayment } from '../fixtures/generators';

describe('calculatePlayerBalance with Categories', () => {
  const PLAYER_ID = 'player-1';

  it('should count DEPOSIT category as credit even if paid is false', () => {
    const payments = [
      generatePayment({ 
        userId: PLAYER_ID, 
        amount: 50, 
        paid: false,
        category: PaymentCategory.DEPOSIT 
      })
    ];
    const balance = calculatePlayerBalance(PLAYER_ID, payments, [], [], []);
    expect(balance).toBe(50);
  });

  it('should count PAYMENT category as credit', () => {
    const payments = [
      generatePayment({ 
        userId: PLAYER_ID, 
        amount: 30, 
        paid: true,
        category: PaymentCategory.PAYMENT 
      })
    ];
    const balance = calculatePlayerBalance(PLAYER_ID, payments, [], [], []);
    expect(balance).toBe(30);
  });

  it('should count unknown category if paid is true (legacy fallback)', () => {
    const payments = [
      generatePayment({ 
        userId: PLAYER_ID, 
        amount: 20, 
        paid: true
      })
    ];
    const balance = calculatePlayerBalance(PLAYER_ID, payments, [], [], []);
    expect(balance).toBe(20);
  });

    it('should NOT count unknown category if paid is false', () => {
    const payments = [
      generatePayment({ 
        userId: PLAYER_ID, 
        amount: 20, 
        paid: false
      })
    ];
    const balance = calculatePlayerBalance(PLAYER_ID, payments, [], [], []);
    expect(balance).toBe(0);
  });
});
