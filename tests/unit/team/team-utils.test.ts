import { describe, it, expect } from 'vitest';

import { chooseInitialTeamId, extractTeamIdFromTeamMemberPath } from '@/team/team-utils';

describe('team-utils', () => {
  describe('extractTeamIdFromTeamMemberPath', () => {
    it('should extract teamId from valid teamMember path', () => {
      expect(extractTeamIdFromTeamMemberPath('teams/abc/teamMembers/u1')).toBe('abc');
    });

    it('should return null for invalid paths', () => {
      expect(extractTeamIdFromTeamMemberPath('users/u1')).toBeNull();
      expect(extractTeamIdFromTeamMemberPath('teams/abc/players/u1')).toBeNull();
      expect(extractTeamIdFromTeamMemberPath('teams//teamMembers/u1')).toBeNull();
    });
  });

  describe('chooseInitialTeamId', () => {
    it('should prefer persistedTeamId if it exists in availableTeamIds', () => {
      expect(
        chooseInitialTeamId({
          persistedTeamId: 't2',
          availableTeamIds: ['t1', 't2'],
        })
      ).toBe('t2');
    });

    it('should auto-select the only available team if none persisted', () => {
      expect(
        chooseInitialTeamId({
          persistedTeamId: null,
          availableTeamIds: ['only'],
        })
      ).toBe('only');
    });

    it('should return null if multiple teams and no valid persisted team', () => {
      expect(
        chooseInitialTeamId({
          persistedTeamId: 'missing',
          availableTeamIds: ['t1', 't2'],
        })
      ).toBeNull();
    });
  });
});
