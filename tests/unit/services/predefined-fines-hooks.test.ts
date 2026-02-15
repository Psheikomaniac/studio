/**
 * Unit Tests: useTeamPredefinedFines hook
 * Tests the real-time subscription hook for predefined fines
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Hoist mock functions so they're available in vi.mock factories
const {
  mockUseFirebaseOptional,
  mockUseMemoFirebase,
  mockUseCollection,
  mockCollection,
  mockQuery,
  mockOrderBy,
} = vi.hoisted(() => ({
  mockUseFirebaseOptional: vi.fn(),
  mockUseMemoFirebase: vi.fn(),
  mockUseCollection: vi.fn(),
  mockCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockOrderBy: vi.fn(),
}));

vi.mock('@/firebase/use-firebase-optional', () => ({
  useFirebaseOptional: mockUseFirebaseOptional,
}));

vi.mock('@/firebase', () => ({
  useMemoFirebase: mockUseMemoFirebase,
  useCollection: mockUseCollection,
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  query: mockQuery,
  orderBy: mockOrderBy,
}));

import { useTeamPredefinedFines } from '@/services/predefined-fines.service';

describe('useTeamPredefinedFines', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: useMemoFirebase passes through to factory
    mockUseMemoFirebase.mockImplementation((factory: () => any) => factory());
    // Default: useCollection returns loading state
    mockUseCollection.mockReturnValue({ data: null, isLoading: true, error: null });
  });

  it('should return null query when teamId is null', () => {
    mockUseFirebaseOptional.mockReturnValue({
      firestore: {},
    });

    renderHook(() => useTeamPredefinedFines(null));

    expect(mockUseCollection).toHaveBeenCalledWith(null);
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('should return null query when teamId is undefined', () => {
    mockUseFirebaseOptional.mockReturnValue({
      firestore: {},
    });

    renderHook(() => useTeamPredefinedFines(undefined));

    expect(mockUseCollection).toHaveBeenCalledWith(null);
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('should return null query when firebase is not available', () => {
    mockUseFirebaseOptional.mockReturnValue(null);

    renderHook(() => useTeamPredefinedFines('team-1'));

    expect(mockUseCollection).toHaveBeenCalledWith(null);
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('should return null query when firestore is not available', () => {
    mockUseFirebaseOptional.mockReturnValue({ firestore: null });

    renderHook(() => useTeamPredefinedFines('team-1'));

    expect(mockUseCollection).toHaveBeenCalledWith(null);
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('should construct correct query when teamId is provided', () => {
    const fakeFirestore = { type: 'firestore' };
    const fakeCol = { type: 'collection' };
    const fakeOrderByRef = { type: 'orderBy' };
    const fakeQueryRef = { type: 'query' };

    mockUseFirebaseOptional.mockReturnValue({ firestore: fakeFirestore });
    mockCollection.mockReturnValue(fakeCol);
    mockOrderBy.mockReturnValue(fakeOrderByRef);
    mockQuery.mockReturnValue(fakeQueryRef);

    renderHook(() => useTeamPredefinedFines('team-42'));

    expect(mockCollection).toHaveBeenCalledWith(fakeFirestore, 'teams/team-42/predefinedFines');
    expect(mockOrderBy).toHaveBeenCalledWith('reason', 'asc');
    expect(mockQuery).toHaveBeenCalledWith(fakeCol, fakeOrderByRef);
    expect(mockUseCollection).toHaveBeenCalledWith(fakeQueryRef);
  });

  it('should return data from useCollection when available', () => {
    const fakeFines = [
      { id: '1', reason: 'Late', amount: 5, teamId: 'team-1' },
      { id: '2', reason: 'Red card', amount: 20, teamId: 'team-1' },
    ];

    mockUseFirebaseOptional.mockReturnValue({ firestore: {} });
    mockCollection.mockReturnValue({});
    mockOrderBy.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockUseCollection.mockReturnValue({ data: fakeFines, isLoading: false, error: null });

    const { result } = renderHook(() => useTeamPredefinedFines('team-1'));

    expect(result.current.data).toEqual(fakeFines);
    expect(result.current.isLoading).toBe(false);
  });
});
