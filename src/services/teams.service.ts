/**
 * TeamsService - Manages teams and memberships in Firestore
 *
 * Data model (PRD Team Tenancy):
 * - teams/{teamId}
 * - teams/{teamId}/teamMembers/{uid}
 */

'use client';

import {
  doc,
  getDoc,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import { useMemo } from 'react';
import { BaseFirebaseService } from './base.service';
import type { ServiceResult } from './types';
import type { Team, TeamMember, TeamRole } from '@/lib/types';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeInviteCode(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

export function generateInviteCode(length = 8): string {
  if (length <= 0) return '';

  let out = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length);
    out += INVITE_CODE_ALPHABET[idx];
  }
  return out;
}

export class TeamsService extends BaseFirebaseService<Team> {
  constructor(firestore: Firestore) {
    super(firestore, 'teams');
  }

  private teamRef(teamId: string) {
    return doc(this.firestore, 'teams', teamId);
  }

  private teamMemberRef(teamId: string, uid: string) {
    return doc(this.firestore, 'teams', teamId, 'teamMembers', uid);
  }

  private inviteRef(inviteCode: string) {
    return doc(this.firestore, 'teamInvites', inviteCode);
  }

  /**
   * Create a team and add the creating user as owner.
   */
  async createTeam(params: {
    name: string;
    ownerUid: string;
    inviteCode?: string;
    clubId?: string;
  }): Promise<ServiceResult<{ team: Team; membership: TeamMember }>> {
    try {
      const teamId = this.generateId();
      const now = this.timestamp();

      const name = params.name.trim();
      if (!name) {
        return {
          success: false,
          error: new Error('Teamname ist ungültig.'),
        };
      }

      const inviteCode = normalizeInviteCode(params.inviteCode ?? generateInviteCode(8));
      if (!inviteCode) {
        return {
          success: false,
          error: new Error('Invite-Code ist ungültig.'),
        };
      }

      const team: Team = {
        id: teamId,
        name,
        ownerUid: params.ownerUid,
        inviteCode,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };

      if (params.clubId) {
        team.clubId = params.clubId;
      }

      const membership: TeamMember = {
        uid: params.ownerUid,
        role: 'owner',
        joinedAt: now,
      };

      const teamRef = this.teamRef(teamId);
      const memberRef = this.teamMemberRef(teamId, params.ownerUid);
      const inviteRef = this.inviteRef(inviteCode);

      await runTransaction(this.firestore, async (tx) => {
        // Ensure inviteCode is unique by claiming it via a dedicated document.
        const inviteSnap = await tx.get(inviteRef);
        if (inviteSnap.exists()) {
          throw new Error('Invite-Code ist bereits vergeben. Bitte erneut versuchen.');
        }

        tx.set(inviteRef, { inviteCode, teamId, createdAt: now } as any);
        tx.set(teamRef, team as any);
        tx.set(memberRef, membership as any);
      });

      return {
        success: true,
        data: { team, membership },
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async addMember(params: {
    teamId: string;
    uid: string;
    role?: TeamRole;
  }): Promise<ServiceResult<TeamMember>> {
    try {
      const now = this.timestamp();
      const member: TeamMember = {
        uid: params.uid,
        role: params.role ?? 'member',
        joinedAt: now,
      };

      const memberRef = this.teamMemberRef(params.teamId, params.uid);
      const teamRef = this.teamRef(params.teamId);

      await runTransaction(this.firestore, async (tx) => {
        tx.set(memberRef, member as any);
        tx.update(teamRef, { updatedAt: now } as any);
      });

      return { success: true, data: member };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async joinTeamByInviteCode(params: {
    inviteCode: string;
    uid: string;
  }): Promise<ServiceResult<{ teamId: string; inviteCode: string }>> {
    try {
      const inviteCode = normalizeInviteCode(params.inviteCode);
      if (!inviteCode) {
        return {
          success: false,
          error: new Error('Bitte einen Invite-Code eingeben.'),
        };
      }

      const inviteRef = this.inviteRef(inviteCode);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) {
        return {
          success: false,
          error: new Error('Kein Team mit diesem Invite-Code gefunden.'),
        };
      }

      const inviteData = inviteSnap.data() as { teamId?: string };
      const teamId = inviteData.teamId;
      if (!teamId) {
        return {
          success: false,
          error: new Error('Invite-Code ist ungültig.'),
        };
      }

      const memberResult = await this.addMember({ teamId, uid: params.uid, role: 'member' });
      if (!memberResult.success) {
        return {
          success: false,
          error: memberResult.error ?? new Error('Beitritt fehlgeschlagen.'),
        };
      }

      return { success: true, data: { teamId, inviteCode } };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }
}

export function useTeamsService(): TeamsService | null {
  const firebase = useFirebaseOptional();
  return useMemo(() => {
    if (!firebase?.firestore) return null;
    return new TeamsService(firebase.firestore);
  }, [firebase?.firestore]);
}
