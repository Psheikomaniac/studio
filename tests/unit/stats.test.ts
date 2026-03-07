import { describe, it, expect } from 'vitest';
import { groupPaymentsByDay, movingAverage } from '@/lib/stats';
import { generatePayment } from '../fixtures/generators';

describe('groupPaymentsByDay', () => {
  describe('without date range', () => {
    it('should return an empty array for no payments', () => {
      expect(groupPaymentsByDay([])).toEqual([]);
    });

    it('should group payments by day and sum amounts', () => {
      const date = '2025-03-01T10:00:00.000Z';
      const payments = [
        generatePayment({ amount: 10, date }),
        generatePayment({ amount: 20, date }),
      ];
      const result = groupPaymentsByDay(payments);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(30);
    });

    it('should return only days with payments (no zero-fill without range)', () => {
      const payments = [
        generatePayment({ amount: 5, date: '2025-03-01T10:00:00.000Z' }),
        generatePayment({ amount: 8, date: '2025-03-03T10:00:00.000Z' }),
      ];
      const result = groupPaymentsByDay(payments);
      // No zero-fill without start/end — only 2 entries
      expect(result).toHaveLength(2);
    });

    it('should sort results by date ascending', () => {
      const payments = [
        generatePayment({ amount: 5, date: '2025-03-03T10:00:00.000Z' }),
        generatePayment({ amount: 8, date: '2025-03-01T10:00:00.000Z' }),
      ];
      const result = groupPaymentsByDay(payments);
      expect(result[0].date).toBe('2025-03-01');
      expect(result[1].date).toBe('2025-03-03');
    });
  });

  describe('with date range (zero-fill)', () => {
    it('should zero-fill all days in the range even if no payments exist', () => {
      const start = new Date('2025-03-01T00:00:00.000Z');
      const end = new Date('2025-03-03T23:59:59.000Z');
      const result = groupPaymentsByDay([], start, end);
      expect(result).toHaveLength(3);
      expect(result.map(p => p.date)).toEqual(['2025-03-01', '2025-03-02', '2025-03-03']);
      expect(result.every(p => p.value === 0)).toBe(true);
    });

    it('should produce exactly 28 data points for a 28-day window with no payments', () => {
      const end = new Date('2025-03-28T00:00:00.000Z');
      const start = new Date('2025-03-01T00:00:00.000Z');
      const result = groupPaymentsByDay([], start, end);
      expect(result).toHaveLength(28);
    });

    it('should fill days without payments as 0 and days with payments as their sum', () => {
      const start = new Date('2025-03-01T00:00:00.000Z');
      const end = new Date('2025-03-03T23:59:59.000Z');
      const payments = [
        generatePayment({ amount: 15, date: '2025-03-02T10:00:00.000Z' }),
      ];
      const result = groupPaymentsByDay(payments, start, end);
      expect(result).toHaveLength(3);
      expect(result.find(p => p.date === '2025-03-01')?.value).toBe(0);
      expect(result.find(p => p.date === '2025-03-02')?.value).toBe(15);
      expect(result.find(p => p.date === '2025-03-03')?.value).toBe(0);
    });

    it('should exclude payments outside the date range', () => {
      const start = new Date('2025-03-05T00:00:00.000Z');
      const end = new Date('2025-03-07T23:59:59.000Z');
      const payments = [
        generatePayment({ amount: 100, date: '2025-03-01T10:00:00.000Z' }), // before range
        generatePayment({ amount: 20, date: '2025-03-06T10:00:00.000Z' }),   // in range
        generatePayment({ amount: 50, date: '2025-03-10T10:00:00.000Z' }), // after range
      ];
      const result = groupPaymentsByDay(payments, start, end);
      expect(result).toHaveLength(3);
      expect(result.find(p => p.date === '2025-03-06')?.value).toBe(20);
      expect(result.find(p => p.date === '2025-03-05')?.value).toBe(0);
      expect(result.find(p => p.date === '2025-03-07')?.value).toBe(0);
    });
  });
});

describe('movingAverage', () => {
  it('should return copy of series for window <= 1', () => {
    const series = [{ date: '2025-01-01', value: 10 }, { date: '2025-01-02', value: 20 }];
    expect(movingAverage(series, 1)).toEqual(series);
  });

  it('should compute rolling average for window=3', () => {
    const series = [
      { date: '2025-01-01', value: 1 },
      { date: '2025-01-02', value: 2 },
      { date: '2025-01-03', value: 3 },
      { date: '2025-01-04', value: 4 },
    ];
    const result = movingAverage(series, 3);
    expect(result[0].value).toBeCloseTo(1);     // avg(1) = 1
    expect(result[1].value).toBeCloseTo(1.5);   // avg(1,2) = 1.5
    expect(result[2].value).toBeCloseTo(2);     // avg(1,2,3) = 2
    expect(result[3].value).toBeCloseTo(3);     // avg(2,3,4) = 3
  });

  it('should return empty array for empty input', () => {
    expect(movingAverage([], 7)).toEqual([]);
  });
});
