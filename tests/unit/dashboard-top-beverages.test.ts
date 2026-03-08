/**
 * Tests for Top Beverages display logic in the dashboard.
 * Verifies that isBeverageFine correctly classifies fines for the top-beverages widget.
 */
import { describe, it, expect } from 'vitest';
import { isBeverageFine } from '@/lib/types';
import type { Fine } from '@/lib/types';

function makeFine(overrides: Partial<Fine> = {}): Fine {
  return {
    id: 'f1',
    userId: 'u1',
    reason: 'Test',
    amount: 2.5,
    date: '2025-01-01T00:00:00.000Z',
    paid: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Replicates the dashboard Top Beverages aggregation logic so we can test it in isolation.
 */
function computeTopBeverages(fines: Fine[]): Map<string, { name: string; count: number }> {
  const counts = new Map<string, { name: string; count: number }>();
  for (const f of fines) {
    if (!f || !isBeverageFine(f)) continue;
    const name = f.reason || 'Unknown';
    const item = counts.get(name) || { name, count: 0 };
    item.count += 1;
    counts.set(name, item);
  }
  return counts;
}

describe('Dashboard — Top Beverages display logic', () => {
  it('counts fines with fineType=beverage', () => {
    const fines = [
      makeFine({ reason: 'Bier', fineType: 'beverage', beverageId: 'bev-1' }),
      makeFine({ id: 'f2', reason: 'Bier', fineType: 'beverage', beverageId: 'bev-1' }),
      makeFine({ id: 'f3', reason: 'Cola', fineType: 'beverage', beverageId: 'bev-2' }),
    ];
    const result = computeTopBeverages(fines);
    expect(result.get('Bier')?.count).toBe(2);
    expect(result.get('Cola')?.count).toBe(1);
  });

  it('counts legacy beverage fines (beverageId set, no fineType)', () => {
    const fines = [
      makeFine({ reason: 'Bier', beverageId: 'bev-1', fineType: undefined }),
    ];
    const result = computeTopBeverages(fines);
    expect(result.get('Bier')?.count).toBe(1);
  });

  it('excludes regular fines (no fineType, no beverageId)', () => {
    const fines = [
      makeFine({ reason: 'Late to practice', fineType: undefined, beverageId: undefined }),
    ];
    const result = computeTopBeverages(fines);
    expect(result.size).toBe(0);
  });

  it('returns empty map when fines array is empty', () => {
    expect(computeTopBeverages([])).toHaveProperty('size', 0);
  });

  it('uses reason as beverage name when set', () => {
    const fines = [makeFine({ reason: 'Pilsner', fineType: 'beverage', beverageId: 'bev-1' })];
    const result = computeTopBeverages(fines);
    expect(result.get('Pilsner')?.name).toBe('Pilsner');
  });
});
