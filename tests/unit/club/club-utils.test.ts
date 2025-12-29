import { describe, it, expect } from 'vitest';
import { chooseInitialClubId, extractClubIdFromClubMemberPath } from '@/club/club-utils';

describe('club-utils', () => {
  describe('extractClubIdFromClubMemberPath', () => {
    it('should extract clubId from valid clubMember path', () => {
      expect(extractClubIdFromClubMemberPath('clubs/abc/clubMembers/u1')).toBe('abc');
    });

    it('should return null for invalid paths', () => {
      expect(extractClubIdFromClubMemberPath('users/u1')).toBeNull();
      expect(extractClubIdFromClubMemberPath('clubs/abc/players/u1')).toBeNull();
      expect(extractClubIdFromClubMemberPath('clubs//clubMembers/u1')).toBeNull();
    });
  });

  describe('chooseInitialClubId', () => {
    it('should prefer persistedClubId if it exists in availableClubIds', () => {
      expect(
        chooseInitialClubId({
          persistedClubId: 'c2',
          availableClubIds: ['c1', 'c2'],
        })
      ).toBe('c2');
    });

    it('should auto-select the only available club if none persisted', () => {
      expect(
        chooseInitialClubId({
          persistedClubId: null,
          availableClubIds: ['only'],
        })
      ).toBe('only');
    });

    it('should return persistedId even if not in availableClubIds (optimistic creation)', () => {
      expect(
        chooseInitialClubId({
          persistedClubId: 'missing',
          availableClubIds: ['c1', 'c2'],
        })
      ).toBe('missing');
    });
  });
});
