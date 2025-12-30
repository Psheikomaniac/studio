/**
 * ClubsService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import {
  clearMockDocuments,
  createMockFirestore,
  getMockDocument,
  setMockDocument,
} from '../../mocks/firestore-mock';
import { ClubsService } from '@/services/clubs.service';

vi.mock('firebase/firestore', async () => {
  const mocks = await import('../../mocks/firestore-mock');
  return mocks.mockFirestoreFunctions as any;
});

describe('ClubsService', () => {
  let firestore: Firestore;
  let service: ClubsService;

  beforeEach(() => {
    clearMockDocuments();
    vi.clearAllMocks();
    firestore = createMockFirestore();
    service = new ClubsService(firestore);
  });

  describe('createClub', () => {
    it('should create club doc and owner membership doc', async () => {
      const result = await service.createClub({ name: 'TSV Musterstadt', ownerUid: 'owner-uid' });
      expect(result.success).toBe(true);
      expect(result.data?.club.id).toBeDefined();

      const clubId = result.data!.club.id;
      const clubDoc = getMockDocument(`clubs/${clubId}`);
      const memberDoc = getMockDocument(`clubs/${clubId}/clubMembers/owner-uid`);

      expect(clubDoc).toBeDefined();
      expect(clubDoc.name).toBe('TSV Musterstadt');
      expect(clubDoc.ownerUid).toBe('owner-uid');

      expect(memberDoc).toBeDefined();
      expect(memberDoc.uid).toBe('owner-uid');
      expect(memberDoc.role).toBe('owner');
    });
  });

  describe('searchClubsByNamePrefix', () => {
    it('should return empty list for prefixes shorter than 3 chars', async () => {
      setMockDocument('clubs/a', {
        id: 'a',
        name: 'TSV Alpha',
        ownerUid: 'u1',
        createdAt: 't',
        updatedAt: 't',
      });

      const res = await service.searchClubsByNamePrefix({ prefix: 'TS' });
      expect(res.success).toBe(true);
      expect(res.data).toEqual([]);
    });

    it('should find clubs by name prefix (case-sensitive)', async () => {
      setMockDocument('clubs/a', {
        id: 'a',
        name: 'TSV Alpha',
        ownerUid: 'u1',
        createdAt: 't',
        updatedAt: 't',
      });
      setMockDocument('clubs/b', {
        id: 'b',
        name: 'TSV Beta',
        ownerUid: 'u2',
        createdAt: 't',
        updatedAt: 't',
      });
      setMockDocument('clubs/c', {
        id: 'c',
        name: 'VfL Gamma',
        ownerUid: 'u3',
        createdAt: 't',
        updatedAt: 't',
      });

      const res = await service.searchClubsByNamePrefix({ prefix: 'TSV' });
      expect(res.success).toBe(true);
      expect(res.data?.map((c) => c.name)).toEqual(['TSV Alpha', 'TSV Beta']);
    });
  });
});
