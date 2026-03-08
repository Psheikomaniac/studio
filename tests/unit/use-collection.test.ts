import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCollection } from '@/firebase/firestore/use-collection';
import {
  clearMockDocuments,
  setMockDocument,
  createMockCollectionReference,
} from '../mocks/firestore-mock';

/**
 * Creates a properly memoized mock collection reference.
 * useCollection validates that its argument has __memo=true to enforce memoization.
 */
function makeMemoRef(path: string) {
  return Object.assign(createMockCollectionReference(path), { __memo: true });
}

describe('useCollection — refetch', () => {
  const COLLECTION_PATH = 'teams/t1/players';

  beforeEach(() => {
    clearMockDocuments();
  });

  it('exposes refetch as a function', async () => {
    const ref = makeMemoRef(COLLECTION_PATH);
    const { result } = renderHook(() => useCollection(ref));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('calling refetch() does not throw', async () => {
    const ref = makeMemoRef(COLLECTION_PATH);
    const { result } = renderHook(() => useCollection(ref));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(() => {
      act(() => result.current.refetch());
    }).not.toThrow();
  });

  it('data is refreshed after calling refetch() when a document was added', async () => {
    setMockDocument(`${COLLECTION_PATH}/p1`, { name: 'Alice', active: true });

    const ref = makeMemoRef(COLLECTION_PATH);
    const { result } = renderHook(() => useCollection(ref));

    // Initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);

    // Add a second document and trigger refetch
    setMockDocument(`${COLLECTION_PATH}/p2`, { name: 'Bob', active: false });
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    const names = result.current.data!.map(d => (d as any).name).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('data reflects an updated document after calling refetch()', async () => {
    setMockDocument(`${COLLECTION_PATH}/p1`, { name: 'Alice', active: true });

    const ref = makeMemoRef(COLLECTION_PATH);
    const { result } = renderHook(() => useCollection(ref));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect((result.current.data![0] as any).active).toBe(true);

    // Simulate what updatePlayer writes to Firestore
    setMockDocument(`${COLLECTION_PATH}/p1`, { name: 'Alice', active: false });
    act(() => result.current.refetch());

    await waitFor(() => expect((result.current.data![0] as any).active).toBe(false));
  });
});
