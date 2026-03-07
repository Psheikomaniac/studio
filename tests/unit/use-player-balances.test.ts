import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerBalances } from '@/hooks/use-player-balances';
import { PaymentCategory } from '@/lib/types';
import {
  generatePayment,
  generateFine,
  generateBeverageFine,
  generateDuePayment,
} from '../fixtures/generators';

describe('usePlayerBalances', () => {
  const PLAYER_ID = 'player-1';

  describe('Credits — paid semantics', () => {
    it('should count payments with paid=true as credits', () => {
      const payments = [generatePayment({ userId: PLAYER_ID, amount: 50, paid: true, reason: 'Guthaben' })];
      const { result } = renderHook(() => usePlayerBalances(payments, [], []));
      const b = result.current.get(PLAYER_ID);
      expect(b?.totalCredits).toBe(50);
    });

    it('should NOT count payments with paid=false and no category as credits', () => {
      const payments = [generatePayment({ userId: PLAYER_ID, amount: 50, paid: false, category: undefined })];
      const { result } = renderHook(() => usePlayerBalances(payments, [], []));
      const b = result.current.get(PLAYER_ID);
      expect(b?.totalCredits ?? 0).toBe(0);
    });

    it('should count DEPOSIT category as credit regardless of paid status', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 30, paid: false, category: PaymentCategory.DEPOSIT }),
      ];
      const { result } = renderHook(() => usePlayerBalances(payments, [], []));
      const b = result.current.get(PLAYER_ID);
      expect(b?.totalCredits).toBe(30);
    });

    it('should count PAYMENT category as credit regardless of paid status', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 20, paid: false, category: PaymentCategory.PAYMENT }),
      ];
      const { result } = renderHook(() => usePlayerBalances(payments, [], []));
      const b = result.current.get(PLAYER_ID);
      expect(b?.totalCredits).toBe(20);
    });

    it('should NOT count TRANSFER category payments as credits', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true, category: PaymentCategory.TRANSFER }),
      ];
      const { result } = renderHook(() => usePlayerBalances(payments, [], []));
      const b = result.current.get(PLAYER_ID);
      expect(b?.totalCredits ?? 0).toBe(0);
    });
  });

  describe('Beverage fines — legacy detection via beverageId', () => {
    it('should count legacy beverage fine (beverageId set, no fineType) as beverages liability', () => {
      // Legacy fine: no fineType, but has beverageId
      const legacyBevFine = generateFine({
        userId: PLAYER_ID,
        amount: 2,
        paid: false,
        beverageId: 'bev-1',
        fineType: undefined,
      });
      const { result } = renderHook(() => usePlayerBalances([], [legacyBevFine], []));
      const b = result.current.get(PLAYER_ID);
      expect(b?.beverages).toBe(2);
      expect(b?.fines).toBe(0);
    });

    it('should count modern beverage fine (fineType=beverage) as beverages liability', () => {
      const bevFine = generateBeverageFine({ userId: PLAYER_ID, amount: 3, paid: false });
      const { result } = renderHook(() => usePlayerBalances([], [bevFine], []));
      const b = result.current.get(PLAYER_ID);
      expect(b?.beverages).toBe(3);
      expect(b?.fines).toBe(0);
    });

    it('should count regular fine (no fineType, no beverageId) as fines liability', () => {
      const regularFine = generateFine({ userId: PLAYER_ID, amount: 5, paid: false });
      const { result } = renderHook(() => usePlayerBalances([], [regularFine], []));
      const b = result.current.get(PLAYER_ID);
      expect(b?.fines).toBe(5);
      expect(b?.beverages).toBe(0);
    });
  });

  describe('Balance calculation', () => {
    it('should compute balance = credits - liabilities', () => {
      const payments = [generatePayment({ userId: PLAYER_ID, amount: 100, paid: true, reason: 'Guthaben' })];
      const fines = [generateFine({ userId: PLAYER_ID, amount: 10, paid: false })];
      const duePayments = [generateDuePayment({ userId: PLAYER_ID, amountDue: 20, paid: false, exempt: false })];
      const { result } = renderHook(() => usePlayerBalances(payments, fines, duePayments));
      const b = result.current.get(PLAYER_ID);
      expect(b?.balance).toBe(70); // 100 - 10 - 20
    });

    it('should isolate balances per player', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true, reason: 'Guthaben' }),
        generatePayment({ userId: 'player-2', amount: 80, paid: true, reason: 'Guthaben' }),
      ];
      const { result } = renderHook(() => usePlayerBalances(payments, [], []));
      expect(result.current.get(PLAYER_ID)?.totalCredits).toBe(50);
      expect(result.current.get('player-2')?.totalCredits).toBe(80);
    });
  });
});
