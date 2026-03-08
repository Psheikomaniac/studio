import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerStats } from '@/hooks/use-player-stats';
import type { Fine, Payment, DuePayment } from '@/lib/types';

function makeFine(overrides: Partial<Fine> = {}): Fine {
  return {
    id: 'f1',
    userId: 'u1',
    reason: 'Test fine',
    amount: 10,
    date: '2025-01-15T10:00:00.000Z',
    paid: false,
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    userId: 'u1',
    reason: 'Test payment',
    amount: 20,
    date: '2025-01-20T10:00:00.000Z',
    paid: true,
    ...overrides,
  };
}

function makeDuePayment(overrides: Partial<DuePayment> = {}): DuePayment {
  return {
    id: 'dp1',
    dueId: 'due1',
    userId: 'u1',
    userName: 'Player One',
    amountDue: 50,
    paid: false,
    exempt: false,
    createdAt: '2025-01-25T10:00:00.000Z',
    ...overrides,
  };
}

describe('usePlayerStats – beverageCountByUser', () => {
  it('counts beverage fines with fineType=beverage per user', () => {
    const fines = [
      makeFine({ userId: 'u1', fineType: 'beverage', beverageId: 'bev1' }),
      makeFine({ id: 'f2', userId: 'u1', fineType: 'beverage', beverageId: 'bev1' }),
      makeFine({ id: 'f3', userId: 'u2', fineType: 'beverage', beverageId: 'bev2' }),
    ];
    const { result } = renderHook(() => usePlayerStats([], fines, []));
    expect(result.current.beverageCountByUser.get('u1')).toBe(2);
    expect(result.current.beverageCountByUser.get('u2')).toBe(1);
  });

  it('counts legacy beverage fines with beverageId but no fineType (pre-V9 records)', () => {
    const fines = [
      makeFine({ userId: 'u1', beverageId: 'bev1', fineType: undefined }),
    ];
    const { result } = renderHook(() => usePlayerStats([], fines, []));
    expect(result.current.beverageCountByUser.get('u1')).toBe(1);
  });

  it('does not count regular fines as beverages', () => {
    const fines = [
      makeFine({ userId: 'u1', fineType: undefined, beverageId: undefined }),
      makeFine({ id: 'f2', userId: 'u1', fineType: 'regular' }),
    ];
    const { result } = renderHook(() => usePlayerStats([], fines, []));
    expect(result.current.beverageCountByUser.get('u1')).toBeUndefined();
  });

  it('returns empty map when fines array is empty', () => {
    const { result } = renderHook(() => usePlayerStats([], [], []));
    expect(result.current.beverageCountByUser.size).toBe(0);
  });

  it('ignores fines without userId', () => {
    const fines = [
      makeFine({ userId: '', fineType: 'beverage', beverageId: 'bev1' }),
    ];
    const { result } = renderHook(() => usePlayerStats([], fines, []));
    expect(result.current.beverageCountByUser.size).toBe(0);
  });
});

describe('usePlayerStats – lastActivityByUser', () => {
  it('tracks the most recent date across fines, payments, and duePayments', () => {
    const fines = [makeFine({ userId: 'u1', date: '2025-01-10T00:00:00.000Z' })];
    const payments = [makePayment({ userId: 'u1', date: '2025-03-01T00:00:00.000Z' })];
    const duePayments = [makeDuePayment({ userId: 'u1', createdAt: '2025-02-01T00:00:00.000Z' })];
    const { result } = renderHook(() => usePlayerStats(payments, fines, duePayments));
    expect(result.current.lastActivityByUser.get('u1')).toBe('2025-03-01T00:00:00.000Z');
  });
});

describe('usePlayerStats – paymentSparklineByUser', () => {
  it('returns empty map when payments array is empty', () => {
    const { result } = renderHook(() => usePlayerStats([], [], []));
    expect(result.current.paymentSparklineByUser.size).toBe(0);
  });

  it('accumulates payment amounts per user for the current month', () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15T10:00:00.000Z`;
    const payments = [
      makePayment({ id: 'p1', userId: 'u1', amount: 30, date: thisMonth }),
      makePayment({ id: 'p2', userId: 'u1', amount: 20, date: thisMonth }),
    ];
    const { result } = renderHook(() => usePlayerStats(payments, [], []));
    const sparkline = result.current.paymentSparklineByUser.get('u1');
    expect(sparkline).toBeDefined();
    // Last slot (index 5) is current month
    expect(sparkline![5]).toBe(50);
  });

  it('shows historical payments when all data is older than 6 months', () => {
    // Payments from ~2 years ago — outside any rolling 6-month window from today
    const payments = [
      makePayment({ id: 'p1', userId: 'u1', amount: 100, date: '2020-03-15T10:00:00.000Z' }),
      makePayment({ id: 'p2', userId: 'u1', amount: 50, date: '2020-02-10T10:00:00.000Z' }),
    ];
    const { result } = renderHook(() => usePlayerStats(payments, [], []));
    const sparkline = result.current.paymentSparklineByUser.get('u1');
    // Window anchors to 2020-03, so u1 should have non-zero data
    expect(sparkline).toBeDefined();
    expect(sparkline!.some(v => v > 0)).toBe(true);
  });

  it('ignores payments without a userId', () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15T10:00:00.000Z`;
    const payments = [makePayment({ userId: '', date: thisMonth })];
    const { result } = renderHook(() => usePlayerStats(payments, [], []));
    expect(result.current.paymentSparklineByUser.size).toBe(0);
  });
});
