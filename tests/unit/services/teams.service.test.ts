/**
 * TeamsService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import {
  clearMockDocuments,
  createMockFirestore,
  getMockDocument,
  setMockDocument,
} from '../../mocks/firestore-mock';
import { TeamsService, generateInviteCode, normalizeInviteCode } from '@/services/teams.service';

vi.mock('firebase/firestore', async () => {
  const mocks = await import('../../mocks/firestore-mock');
  return mocks.mockFirestoreFunctions as any;
});

describe('TeamsService', () => {
  let firestore: Firestore;
  let service: TeamsService;

  beforeEach(() => {
    clearMockDocuments();
    vi.clearAllMocks();
    firestore = createMockFirestore();
    service = new TeamsService(firestore);
  });

  describe('inviteCode utils', () => {
    it('normalizeInviteCode should trim and uppercase', () => {
      expect(normalizeInviteCode('  ab12  ')).toBe('AB12');
    });

    it('generateInviteCode should generate uppercase code with requested length', () => {
      const code = generateInviteCode(10);
      expect(code).toHaveLength(10);
      expect(code).toMatch(/^[A-Z2-9]+$/);
    });
  });

  describe('createTeam', () => {
    it('should create team doc and owner membership doc', async () => {
      const result = await service.createTeam({
        name: 'Test Team',
        ownerUid: 'owner-uid',
        inviteCode: 'ABC12345',
      });

      expect(result.success).toBe(true);
      expect(result.data?.team.id).toBeDefined();
      expect(result.data?.team.inviteCode).toBe('ABC12345');

      const teamId = result.data!.team.id;
      const teamDoc = getMockDocument(`teams/${teamId}`);
      const memberDoc = getMockDocument(`teams/${teamId}/teamMembers/owner-uid`);

      expect(teamDoc).toBeDefined();
      expect(teamDoc.name).toBe('Test Team');
      expect(teamDoc.ownerUid).toBe('owner-uid');
      expect(teamDoc.inviteCode).toBe('ABC12345');

      expect(memberDoc).toBeDefined();
      expect(memberDoc.uid).toBe('owner-uid');
      expect(memberDoc.role).toBe('owner');
    });
  });

  describe('joinTeamByInviteCode', () => {
    it('should add member to the team found by invite code', async () => {
      const created = await service.createTeam({
        name: 'Joinable Team',
        ownerUid: 'owner',
        inviteCode: 'JOIN1234',
      });
      expect(created.success).toBe(true);

      const join = await service.joinTeamByInviteCode({
        inviteCode: ' join1234 ',
        uid: 'new-user',
      });

      expect(join.success).toBe(true);
      expect(join.data?.teamId).toBe(created.data!.team.id);

      const memberDoc = getMockDocument(`teams/${created.data!.team.id}/teamMembers/new-user`);
      expect(memberDoc).toBeDefined();
      expect(memberDoc.uid).toBe('new-user');
      expect(memberDoc.role).toBe('member');
    });
  });

  describe('listTeamsByClubId', () => {
    it('should list teams for a given clubId', async () => {
      setMockDocument('teams/t1', {
        id: 't1',
        clubId: 'club-1',
        name: '1. Herren',
        ownerUid: 'o1',
        inviteCode: 'CODE1',
        archived: false,
        createdAt: 't',
        updatedAt: 't',
      });
      setMockDocument('teams/t2', {
        id: 't2',
        clubId: 'club-1',
        name: '2. Herren',
        ownerUid: 'o2',
        inviteCode: 'CODE2',
        archived: false,
        createdAt: 't',
        updatedAt: 't',
      });
      setMockDocument('teams/t3', {
        id: 't3',
        clubId: 'club-2',
        name: 'Damen',
        ownerUid: 'o3',
        inviteCode: 'CODE3',
        archived: false,
        createdAt: 't',
        updatedAt: 't',
      });

      const res = await service.listTeamsByClubId({ clubId: 'club-1' });
      expect(res.success).toBe(true);
      expect(res.data?.map((t) => t.id).sort()).toEqual(['t1', 't2']);
    });
  });
});
