import { describe, it, expect } from 'vitest';
import type { Due } from '@/lib/types';

/**
 * Tests the getDueName lookup logic used in money/page.tsx and dashboard/page.tsx.
 * The fix for issue #40 ensures that Firestore-loaded dueById map takes precedence
 * over static data, so real imported due IDs (e.g. "due_1714572000000_abc123") resolve
 * to their actual names instead of falling back to 'Unknown'.
 */
function getDueName(id: string, dueById: Map<string, Due>, staticDues: Due[]): string {
  return dueById.get(id)?.name || staticDues.find(d => d.id === id)?.name || 'Unknown';
}

describe('getDueName', () => {
  const staticDues: Due[] = [
    { id: 'due1', name: 'Membership Fee', amount: 50, active: true },
    { id: 'due2', name: 'Training Fee', amount: 20, active: true },
  ];

  it('returns name from Firestore dueById map when id is found there', () => {
    const dueById = new Map<string, Due>([
      ['due_1714572000000_abc123', { id: 'due_1714572000000_abc123', name: 'Saison2526', amount: 100, active: true }],
    ]);
    expect(getDueName('due_1714572000000_abc123', dueById, staticDues)).toBe('Saison2526');
  });

  it('falls back to static data when id is not in Firestore map', () => {
    const dueById = new Map<string, Due>();
    expect(getDueName('due1', dueById, staticDues)).toBe('Membership Fee');
    expect(getDueName('due2', dueById, staticDues)).toBe('Training Fee');
  });

  it('prefers Firestore name over static data when both have the same id', () => {
    const dueById = new Map<string, Due>([
      ['due1', { id: 'due1', name: 'Firestore Override', amount: 60, active: true }],
    ]);
    expect(getDueName('due1', dueById, staticDues)).toBe('Firestore Override');
  });

  it('returns Unknown when id is not found in either source', () => {
    const dueById = new Map<string, Due>();
    expect(getDueName('nonexistent-id', dueById, staticDues)).toBe('Unknown');
  });

  it('returns Unknown for real CSV-imported due IDs when dueById is empty', () => {
    const dueById = new Map<string, Due>();
    expect(getDueName('due_1714572000000_abc123', dueById, staticDues)).toBe('Unknown');
  });

  it('resolves real CSV-imported due IDs correctly when dueById is populated', () => {
    const dueById = new Map<string, Due>([
      ['due_1714572000000_abc123', { id: 'due_1714572000000_abc123', name: 'Saison2526', amount: 100, active: true }],
      ['due_1714572000001_xyz456', { id: 'due_1714572000001_xyz456', name: 'Winter Camp', amount: 80, active: true }],
    ]);
    expect(getDueName('due_1714572000000_abc123', dueById, staticDues)).toBe('Saison2526');
    expect(getDueName('due_1714572000001_xyz456', dueById, staticDues)).toBe('Winter Camp');
  });
});
