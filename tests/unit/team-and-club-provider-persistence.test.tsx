import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, afterEach, expect, vi } from 'vitest';
import { orderBy } from 'firebase/firestore';

import { TeamProvider, useTeam } from '@/team/team-provider';
import { ClubProvider, useClub } from '@/club/club-provider';
import { createMockFirestore } from '../mocks/firestore-mock';

let mockFirebase: any = null;

vi.mock('@/firebase/use-firebase-optional', () => ({
  useFirebaseOptional: () => mockFirebase,
}));

function TeamIdReader() {
  const { teamId, isTeamLoading } = useTeam();
  return <div data-testid="teamId">{isTeamLoading ? 'loading' : (teamId ?? 'null')}</div>;
}

function ClubIdReader() {
  const { clubId, isClubLoading } = useClub();
  return <div data-testid="clubId">{isClubLoading ? 'loading' : (clubId ?? 'null')}</div>;
}

function ClubIdSetter({ clubId }: { clubId: string }) {
  const { setClubId } = useClub();
  React.useEffect(() => {
    setClubId(clubId);
  }, [clubId, setClubId]);
  return null;
}

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  mockFirebase = null;
});

describe('TeamProvider / ClubProvider persistence', () => {
  it('TeamProvider uses uid-scoped key and removes legacy key', async () => {
    localStorage.setItem('currentTeamId', 'legacy-team');
    localStorage.setItem('currentTeamId:u2', 'team-u2');
    localStorage.setItem('currentTeamId:u1', 'team-u1');

    mockFirebase = {
      user: { uid: 'u1', isAnonymous: false },
      firestore: createMockFirestore(),
    };

    render(
      <TeamProvider>
        <TeamIdReader />
      </TeamProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('teamId').textContent).toBe('team-u1');
    });

    expect(localStorage.getItem('currentTeamId')).toBeNull();
  });

  it('TeamProvider does not leak persisted teamId across users', async () => {
    localStorage.setItem('currentTeamId', 'legacy-team');
    localStorage.setItem('currentTeamId:u2', 'team-u2');

    mockFirebase = {
      user: { uid: 'u1', isAnonymous: false },
      firestore: createMockFirestore(),
    };

    render(
      <TeamProvider>
        <TeamIdReader />
      </TeamProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('teamId').textContent).toBe('null');
    });

    expect(localStorage.getItem('currentTeamId')).toBeNull();
  });

  it('ClubProvider uses uid-scoped key and removes legacy key', async () => {
    localStorage.setItem('currentClubId', 'legacy-club');
    localStorage.setItem('currentClubId:u2', 'club-u2');
    localStorage.setItem('currentClubId:u1', 'club-u1');

    mockFirebase = {
      user: { uid: 'u1', isAnonymous: false },
      firestore: createMockFirestore(),
    };

    render(
      <ClubProvider>
        <ClubIdReader />
      </ClubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('clubId').textContent).toBe('club-u1');
    });

    expect(localStorage.getItem('currentClubId')).toBeNull();
  });

  it('ClubProvider does not leak persisted clubId across users', async () => {
    localStorage.setItem('currentClubId', 'legacy-club');
    localStorage.setItem('currentClubId:u2', 'club-u2');

    mockFirebase = {
      user: { uid: 'u1', isAnonymous: false },
      firestore: createMockFirestore(),
    };

    render(
      <ClubProvider>
        <ClubIdReader />
      </ClubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('clubId').textContent).toBe('null');
    });

    expect(localStorage.getItem('currentClubId')).toBeNull();
  });

  it('ClubProvider keeps a manually set clubId stable even if the membership snapshot is still empty', async () => {
    vi.useFakeTimers();

    mockFirebase = {
      user: { uid: 'u1', isAnonymous: false },
      firestore: createMockFirestore(),
    };

    render(
      <ClubProvider>
        <ClubIdSetter clubId="club-manual" />
        <ClubIdReader />
      </ClubProvider>
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByTestId('clubId').textContent).toBe('club-manual');
  });

  it('Providers do not use orderBy in membership collectionGroup queries (avoid watch-stream edge cases)', async () => {
    mockFirebase = {
      user: { uid: 'u1', isAnonymous: false },
      firestore: createMockFirestore(),
    };

    render(
      <>
        <TeamProvider>
          <TeamIdReader />
        </TeamProvider>
        <ClubProvider>
          <ClubIdReader />
        </ClubProvider>
      </>
    );

    await waitFor(() => {
      // Both providers should settle to null without memberships.
      expect(screen.getByTestId('teamId').textContent).toBe('null');
      expect(screen.getByTestId('clubId').textContent).toBe('null');
    });

    expect(orderBy).not.toHaveBeenCalled();
  });
});
