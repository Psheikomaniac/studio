/**
 * Tests for dashboard chart empty-state detection logic.
 *
 * Both the Revenue by Day chart and the Transactions by Type chart use the same
 * pattern: zero-fill the 28-day window, then check if any non-zero value exists.
 * If all values are 0 (no recent activity), the chart hides and shows a message.
 */
import { describe, it, expect } from 'vitest';
import { groupPaymentsByDay } from '@/lib/stats';
import type { Payment } from '@/lib/types';

function make28DayWindow(): { start: Date; end: Date } {
  const end = new Date('2025-03-08T00:00:00.000Z');
  const start = new Date(end);
  start.setDate(end.getDate() - 27);
  return { start, end };
}

function makePayment(date: string, amount = 10): Payment {
  return {
    id: 'p1',
    userId: 'u1',
    teamId: 't1',
    reason: 'Test payment',
    amount,
    date,
    paid: true,
  } as Payment;
}

describe('Revenue by Day chart — empty-state detection', () => {
  it('shows chart when a payment falls within the 28-day window', () => {
    const { start, end } = make28DayWindow();
    const series = groupPaymentsByDay([makePayment('2025-03-07T10:00:00.000Z')], start, end);
    expect(series.some(d => d.value > 0)).toBe(true);
  });

  it('hides chart when all payments are older than 28 days', () => {
    const { start, end } = make28DayWindow();
    const series = groupPaymentsByDay([makePayment('2024-01-01T00:00:00.000Z')], start, end);
    // Zero-fill means series still has 28 entries, but all values are 0
    expect(series).toHaveLength(28);
    expect(series.some(d => d.value > 0)).toBe(false);
  });

  it('hides chart when there are no payments at all', () => {
    const { start, end } = make28DayWindow();
    const series = groupPaymentsByDay([], start, end);
    expect(series).toHaveLength(28);
    expect(series.some(d => d.value > 0)).toBe(false);
  });
});

describe('Transactions by Type chart — zero-fill and empty-state detection', () => {
  /**
   * Replicates the inline zero-fill logic from the dashboard Transactions by Type chart.
   */
  function buildTransactionsDayMap(
    entries: Array<{ date: string; amount: number; type: 'payment' | 'fine' | 'due' | 'beverage' }>,
    start: Date,
    end: Date
  ): Map<string, { date: string; payments: number; fines: number; dues: number; beverages: number }> {
    const map = new Map<string, { date: string; payments: number; fines: number; dues: number; beverages: number }>();

    const keyOf = (ds: string) => {
      const d = new Date(ds);
      if (isNaN(d.getTime()) || d < start || d > end) return '';
      return d.toISOString().slice(0, 10);
    };

    for (const entry of entries) {
      const k = keyOf(entry.date);
      if (!k) continue;
      const row = map.get(k) || { date: k, payments: 0, fines: 0, dues: 0, beverages: 0 };
      row[`${entry.type}s` as 'payments' | 'fines' | 'dues' | 'beverages'] += entry.amount;
      map.set(k, row);
    }

    // Zero-fill — mirrors the dashboard inline logic
    let curMs = new Date(start.toISOString().slice(0, 10) + 'T00:00:00.000Z').getTime();
    const endMs = new Date(end.toISOString().slice(0, 10) + 'T00:00:00.000Z').getTime();
    while (curMs <= endMs) {
      const k = new Date(curMs).toISOString().slice(0, 10);
      if (!map.has(k)) map.set(k, { date: k, payments: 0, fines: 0, dues: 0, beverages: 0 });
      curMs += 86_400_000;
    }

    return map;
  }

  it('produces 28 entries after zero-fill even with no transactions', () => {
    const { start, end } = make28DayWindow();
    const map = buildTransactionsDayMap([], start, end);
    expect(map.size).toBe(28);
  });

  it('hides chart when all transactions are older than 28 days', () => {
    const { start, end } = make28DayWindow();
    const map = buildTransactionsDayMap(
      [{ date: '2024-01-01T00:00:00.000Z', amount: 5, type: 'fine' }],
      start,
      end
    );
    const data = Array.from(map.values());
    const hasData = data.some(d => d.payments + d.fines + d.dues + d.beverages > 0);
    expect(hasData).toBe(false);
  });

  it('shows chart when a transaction falls within the 28-day window', () => {
    const { start, end } = make28DayWindow();
    const map = buildTransactionsDayMap(
      [{ date: '2025-03-05T12:00:00.000Z', amount: 5, type: 'fine' }],
      start,
      end
    );
    const data = Array.from(map.values());
    const hasData = data.some(d => d.payments + d.fines + d.dues + d.beverages > 0);
    expect(hasData).toBe(true);
  });
});
