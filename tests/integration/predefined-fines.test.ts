/**
 * Integration Tests: PredefinedFinesService
 * Tests CRUD operations and seeding against Firestore emulator/mock
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestFirestore } from './setup';
import { PredefinedFinesService } from '@/services/predefined-fines.service';
import { clearCollection, seedTeam } from './helpers/seed-data';

describe('Integration: PredefinedFinesService', () => {
  let firestore: ReturnType<typeof getTestFirestore>;
  const TEAM_ID = 'team-pf-integration';
  const TEAM_ID_2 = 'team-pf-integration-2';

  beforeEach(async () => {
    firestore = getTestFirestore();
    await clearCollection(firestore, 'teams');
    await seedTeam(firestore, TEAM_ID);
    await seedTeam(firestore, TEAM_ID_2);
  });

  describe('CRUD Operations', () => {
    it('should create and retrieve a predefined fine', async () => {
      const service = new PredefinedFinesService(firestore, TEAM_ID);

      const created = await service.create({
        reason: 'Custom fine',
        amount: 15.00,
        teamId: TEAM_ID,
      });

      expect(created.success).toBe(true);
      expect(created.data?.reason).toBe('Custom fine');
      expect(created.data?.amount).toBe(15.00);

      const fetched = await service.getById(created.data!.id);
      expect(fetched.success).toBe(true);
      expect(fetched.data?.reason).toBe('Custom fine');
    });

    it('should update a predefined fine', async () => {
      const service = new PredefinedFinesService(firestore, TEAM_ID);

      const created = await service.create({
        reason: 'Original',
        amount: 5.00,
        teamId: TEAM_ID,
      });

      const updated = await service.update(created.data!.id, {
        reason: 'Updated',
        amount: 10.00,
      });

      expect(updated.success).toBe(true);

      const fetched = await service.getById(created.data!.id);
      expect(fetched.data?.reason).toBe('Updated');
      expect(fetched.data?.amount).toBe(10.00);
    });

    it('should delete a predefined fine', async () => {
      const service = new PredefinedFinesService(firestore, TEAM_ID);

      const created = await service.create({
        reason: 'To be deleted',
        amount: 1.00,
        teamId: TEAM_ID,
      });

      const deleted = await service.delete(created.data!.id);
      expect(deleted.success).toBe(true);

      const fetched = await service.getById(created.data!.id);
      expect(fetched.success).toBe(false);
    });

    it('should list all predefined fines for a team', async () => {
      const service = new PredefinedFinesService(firestore, TEAM_ID);

      await service.create({ reason: 'Fine A', amount: 1.00, teamId: TEAM_ID });
      await service.create({ reason: 'Fine B', amount: 2.00, teamId: TEAM_ID });
      await service.create({ reason: 'Fine C', amount: 3.00, teamId: TEAM_ID });

      const all = await service.getAll();
      expect(all.success).toBe(true);
      expect(all.data).toHaveLength(3);
    });
  });

  describe('seedDefaults()', () => {
    it('should create 7 default predefined fines', async () => {
      const service = new PredefinedFinesService(firestore, TEAM_ID);

      const result = await service.seedDefaults();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(7);

      const reasons = result.data!.map(f => f.reason).sort();
      expect(reasons).toContain('Late for training');
      expect(reasons).toContain('Red card');
      expect(reasons).toContain('Phone in locker room');
    });

    it('should be idempotent — second seed returns same 7 fines', async () => {
      const service = new PredefinedFinesService(firestore, TEAM_ID);

      const first = await service.seedDefaults();
      expect(first.data).toHaveLength(7);

      const second = await service.seedDefaults();
      expect(second.data).toHaveLength(7);

      // Total in collection should still be 7
      const all = await service.getAll();
      expect(all.data).toHaveLength(7);
    });
  });

  describe('Team Isolation', () => {
    it('should scope predefined fines to their team', async () => {
      const service1 = new PredefinedFinesService(firestore, TEAM_ID);
      const service2 = new PredefinedFinesService(firestore, TEAM_ID_2);

      // Seed team 1
      await service1.seedDefaults();

      // Create custom fine for team 2
      await service2.create({ reason: 'Team 2 only', amount: 99.00, teamId: TEAM_ID_2 });

      // Team 1 should have 7 defaults
      const team1Fines = await service1.getAll();
      expect(team1Fines.data).toHaveLength(7);

      // Team 2 should have 1 custom fine
      const team2Fines = await service2.getAll();
      expect(team2Fines.data).toHaveLength(1);
      expect(team2Fines.data![0].reason).toBe('Team 2 only');
    });
  });

  describe('collectionPath', () => {
    it('should return correct Firestore path for a team', () => {
      expect(PredefinedFinesService.collectionPath('my-team')).toBe('teams/my-team/predefinedFines');
    });
  });
});
