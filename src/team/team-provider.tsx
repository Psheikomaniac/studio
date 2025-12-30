'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collectionGroup,
  documentId,
  onSnapshot,
  query,
  where,
  orderBy,
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

const LEGACY_STORAGE_KEY = 'currentTeamId';
const STORAGE_KEY_PREFIX = 'currentTeamId:';

function storageKeyForUid(uid: string) {
  return `${STORAGE_KEY_PREFIX}${uid}`;
}

function readPersistedTeamId(uid: string | null): string | null {
  if (typeof window === 'undefined') return null;
  if (!uid) return null;
  try {
    // Hard stop for legacy key to prevent cross-account leakage.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return localStorage.getItem(storageKeyForUid(uid));
  } catch {
    return null;
  }
}

function persistTeamId(uid: string | null, teamId: string | null) {
  if (typeof window === 'undefined') return;
  if (!uid) return;
  try {
    // Hard stop for legacy key to prevent cross-account leakage.
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    const key = storageKeyForUid(uid);
    if (!teamId) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, teamId);
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
  return query(membersGroup, where('uid', '==', uid), orderBy('joinedAt', 'desc'));
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
    persistTeamId(uid, nextTeamId);
  }, [uid]);

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

    const persistedTeamId = readPersistedTeamId(uid);
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
        console.error('TeamProvider Error:', error);
        if (error.message.includes('index')) {
          console.error(
            '🔥 MISSING INDEX: Please run "firebase deploy --only firestore:indexes" to deploy the defined indexes.'
          );
        }
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
