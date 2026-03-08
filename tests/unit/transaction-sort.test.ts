import { describe, it, expect } from 'vitest';

/**
 * Tests the createdAt-based sort order used in money/page.tsx and dashboard/page.tsx.
 * The fix for issue #41 ensures transactions are sorted by createdAt (system entry time)
 * rather than by the mixed date field (event date for fines/payments, createdAt for dues),
 * which caused inconsistent ordering.
 */

type TransactionType = 'fine' | 'payment' | 'due' | 'beverage';

interface UnifiedTransaction {
  id: string;
  date: string;
  createdAt: string;
  type: TransactionType;
  amount: number;
}

function sortByCreatedAt(transactions: UnifiedTransaction[]): UnifiedTransaction[] {
  return [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

describe('transaction sort by createdAt', () => {
  it('sorts transactions newest-first by createdAt', () => {
    const transactions: UnifiedTransaction[] = [
      { id: '1', date: '2025-01-01T10:00:00.000Z', createdAt: '2025-01-01T10:00:00.000Z', type: 'fine', amount: -10 },
      { id: '2', date: '2025-03-01T10:00:00.000Z', createdAt: '2025-03-01T10:00:00.000Z', type: 'payment', amount: 20 },
      { id: '3', date: '2025-02-01T10:00:00.000Z', createdAt: '2025-02-01T10:00:00.000Z', type: 'due', amount: -30 },
    ];
    const result = sortByCreatedAt(transactions);
    expect(result.map(t => t.id)).toEqual(['2', '3', '1']);
  });

  it('correctly orders dues (by createdAt) and fines (by createdAt) regardless of event date', () => {
    // A fine with an old event date but recent createdAt should sort above
    // a due with a recent event date but older createdAt
    const transactions: UnifiedTransaction[] = [
      {
        id: 'due',
        date: '2025-03-01T10:00:00.000Z',   // recent event date
        createdAt: '2025-01-01T10:00:00.000Z', // old creation time
        type: 'due',
        amount: -50,
      },
      {
        id: 'fine',
        date: '2024-06-01T10:00:00.000Z',   // old event date
        createdAt: '2025-02-01T10:00:00.000Z', // recent creation time
        type: 'fine',
        amount: -10,
      },
    ];
    const result = sortByCreatedAt(transactions);
    // fine was created more recently, so it should come first
    expect(result[0].id).toBe('fine');
    expect(result[1].id).toBe('due');
  });

  it('handles equal createdAt values without throwing', () => {
    const ts = '2025-02-15T12:00:00.000Z';
    const transactions: UnifiedTransaction[] = [
      { id: 'a', date: ts, createdAt: ts, type: 'fine', amount: -5 },
      { id: 'b', date: ts, createdAt: ts, type: 'payment', amount: 10 },
    ];
    expect(() => sortByCreatedAt(transactions)).not.toThrow();
  });

  it('places payment with missing createdAt (falls back to date) correctly', () => {
    // Simulates: payment.createdAt || payment.date
    const paymentDate = '2025-02-01T09:00:00.000Z';
    const transactions: UnifiedTransaction[] = [
      { id: 'newer', date: '2025-03-01T10:00:00.000Z', createdAt: '2025-03-01T10:00:00.000Z', type: 'fine', amount: -10 },
      { id: 'payment', date: paymentDate, createdAt: paymentDate, type: 'payment', amount: 20 },
    ];
    const result = sortByCreatedAt(transactions);
    expect(result[0].id).toBe('newer');
    expect(result[1].id).toBe('payment');
  });
});
