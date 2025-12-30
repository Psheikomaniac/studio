'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collectionGroup,
  onSnapshot,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import type { ClubMember, ClubRole } from '@/lib/types';
import { chooseInitialClubId, extractClubIdFromClubMemberPath } from './club-utils';

export interface ClubMembership {
  clubId: string;
  member: ClubMember;
  role: ClubRole;
}

export interface ClubContextState {
  clubId: string | null;
  memberships: ClubMembership[];
  isClubLoading: boolean;
  clubError: Error | null;
  setClubId: (clubId: string | null) => void;
}

const ClubContext = createContext<ClubContextState | undefined>(undefined);

const LEGACY_STORAGE_KEY = 'currentClubId';
const STORAGE_KEY_PREFIX = 'currentClubId:';

function storageKeyForUid(uid: string) {
  return `${STORAGE_KEY_PREFIX}${uid}`;
}

function readPersistedClubId(uid: string | null): string | null {
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

function persistClubId(uid: string | null, clubId: string | null) {
  if (typeof window === 'undefined') return;
  if (!uid) return;
  try {
    // Hard stop for legacy key to prevent cross-account leakage.
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    const key = storageKeyForUid(uid);
    if (!clubId) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, clubId);
  } catch {
    // ignore
  }
}

function buildMembershipQuery(firestore: Firestore, uid: string) {
  // clubMembers docs are stored at: clubs/{clubId}/clubMembers/{uid}
  const membersGroup = collectionGroup(firestore, 'clubMembers');
  return query(membersGroup, where('uid', '==', uid));
}

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const firebase = useFirebaseOptional();
  const uid = firebase?.user?.uid ?? null;
  const firestore = firebase?.firestore ?? null;

  const [clubId, setClubIdState] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [isClubLoading, setIsClubLoading] = useState(true);
  const [clubError, setClubError] = useState<Error | null>(null);

  const setClubId = useCallback((nextClubId: string | null) => {
    setClubIdState(nextClubId);
    persistClubId(uid, nextClubId);
  }, [uid]);

  useEffect(() => {
    if (!firestore || !uid) {
      setMemberships([]);
      setClubIdState(null);
      setClubError(null);
      setIsClubLoading(false);
      return;
    }

    setIsClubLoading(true);
    setClubError(null);

    const q = buildMembershipQuery(firestore, uid);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextMemberships: ClubMembership[] = snapshot.docs
          .map((docSnap) => {
            const clubIdFromPath = extractClubIdFromClubMemberPath(docSnap.ref.path);
            if (!clubIdFromPath) return null;
            const data = docSnap.data() as Partial<ClubMember> & { role?: ClubRole };
            const role = (data.role ?? 'member') as ClubRole;
            const member: ClubMember = {
              uid: docSnap.id,
              role,
              joinedAt: data.joinedAt ?? '',
            };

            return {
              clubId: clubIdFromPath,
              role,
              member,
            };
          })
          .filter((x): x is ClubMembership => x !== null);

        // Keep a deterministic ordering without relying on server-side orderBy.
        // joinedAt is stored as ISO string; lexicographic sort works for ISO timestamps.
        nextMemberships.sort((a, b) => (b.member.joinedAt ?? '').localeCompare(a.member.joinedAt ?? ''));

        setMemberships(nextMemberships);

        const availableClubIds = nextMemberships.map((m) => m.clubId);
        const persistedClubId = readPersistedClubId(uid);
        const initial = chooseInitialClubId({
          persistedClubId,
          availableClubIds,
        });

        setClubIdState((prev) => {
          // Keep an explicitly selected clubId stable even if memberships are still loading/empty.
          // This prevents short-lived null resets that could cause downstream actions (e.g. team creation)
          // to run without a clubId.
          if (prev) {
            if (availableClubIds.length === 0) return prev;
            if (availableClubIds.includes(prev)) return prev;
          }
          return initial;
        });

        setIsClubLoading(false);
      },
      (error) => {
        console.error('ClubProvider Error:', error);
        if (error.message.includes('index')) {
          console.error(
            '🔥 MISSING INDEX: Please run "firebase deploy --only firestore:indexes" to deploy the defined indexes.'
          );
        }
        setMemberships([]);
        setClubIdState(null);
        setClubError(error);
        setIsClubLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, uid]);

  const value = useMemo<ClubContextState>(() => {
    return {
      clubId,
      memberships,
      isClubLoading,
      clubError,
      setClubId,
    };
  }, [clubId, memberships, isClubLoading, clubError, setClubId]);

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub(): ClubContextState {
  const ctx = useContext(ClubContext);
  if (!ctx) {
    throw new Error('useClub must be used within ClubProvider');
  }
  return ctx;
}

export function useRequireClub(): { clubId: string } {
  const { clubId } = useClub();
  if (!clubId) {
    throw new Error('Club is required but not set');
  }
  return { clubId };
}
