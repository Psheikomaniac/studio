'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collectionGroup,
  documentId,
  onSnapshot,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import type { TeamMember, TeamRole } from '@/lib/types';
import { chooseInitialTeamId, extractTeamIdFromTeamMemberPath } from './team-utils';

export interface TeamMembership {
  teamId: string;
  member: TeamMember;
  role: TeamRole;
}

export interface TeamContextState {
  teamId: string | null;
  memberships: TeamMembership[];
  isTeamLoading: boolean;
  teamError: Error | null;
  setTeamId: (teamId: string | null) => void;
}

const TeamContext = createContext<TeamContextState | undefined>(undefined);

const STORAGE_KEY = 'currentTeamId';

function readPersistedTeamId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistTeamId(teamId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!teamId) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, teamId);
  } catch {
    // ignore
  }
}

function buildMembershipQuery(firestore: Firestore, uid: string) {
  // teamMembers docs are stored at: teams/{teamId}/teamMembers/{uid}
  // We query all teamMembers documents with uid == uid via collectionGroup.
  // Note: We must query by 'uid' field, not documentId(), because collectionGroup
  // queries with documentId() require the full path, which we don't have here.
  const membersGroup = collectionGroup(firestore, 'teamMembers');
  return query(membersGroup, where('uid', '==', uid));
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const firebase = useFirebaseOptional();
  const uid = firebase?.user?.uid ?? null;
  const firestore = firebase?.firestore ?? null;

  const [teamId, setTeamIdState] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<Error | null>(null);

  const setTeamId = useCallback((nextTeamId: string | null) => {
    setTeamIdState(nextTeamId);
    persistTeamId(nextTeamId);
  }, []);

  useEffect(() => {
    // Reset when auth/services disappear (e.g. during logout)
    if (!firestore || !uid) {
      setMemberships([]);
      setTeamIdState(null);
      setTeamError(null);
      setIsTeamLoading(false);
      return;
    }

    setIsTeamLoading(true);
    setTeamError(null);

    const persistedTeamId = readPersistedTeamId();
    const q = buildMembershipQuery(firestore, uid);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextMemberships: TeamMembership[] = snapshot.docs
          .map((docSnap) => {
            const teamIdFromPath = extractTeamIdFromTeamMemberPath(docSnap.ref.path);
            if (!teamIdFromPath) return null;
            const data = docSnap.data() as Partial<TeamMember> & { role?: TeamRole };
            const role = (data.role ?? 'member') as TeamRole;
            const member: TeamMember = {
              uid: docSnap.id,
              role,
              joinedAt: data.joinedAt ?? '',
            };

            return {
              teamId: teamIdFromPath,
              role,
              member,
            };
          })
          .filter((x): x is TeamMembership => x !== null);

        setMemberships(nextMemberships);

        const availableTeamIds = nextMemberships.map((m) => m.teamId);
        const initial = chooseInitialTeamId({
          persistedTeamId,
          availableTeamIds,
        });

        setTeamIdState((prev) => {
          if (prev && availableTeamIds.includes(prev)) return prev;
          // If there is no membership, always clear
          return initial;
        });

        setIsTeamLoading(false);
      },
      (error) => {
        setMemberships([]);
        setTeamIdState(null);
        setTeamError(error);
        setIsTeamLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, uid]);

  const value = useMemo<TeamContextState>(() => {
    return {
      teamId,
      memberships,
      isTeamLoading,
      teamError,
      setTeamId,
    };
  }, [teamId, memberships, isTeamLoading, teamError, setTeamId]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextState {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return ctx;
}

export function useRequireTeam(): { teamId: string } {
  const { teamId } = useTeam();
  if (!teamId) {
    throw new Error('Team is required but not set');
  }
  return { teamId };
}
