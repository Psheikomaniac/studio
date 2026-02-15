import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PredefinedFinesService } from '@/services/predefined-fines.service';
import type { Firestore } from 'firebase/firestore';
import type { PredefinedFine } from '@/lib/types';
import {
  createMockFirestore,
  clearMockDocuments,
  setMockDocument,
  getMockDocument,
} from '../../mocks/firestore-mock';

vi.mock('firebase/firestore', async () => {
  const mocks = await import('../../mocks/firestore-mock');
  return mocks.mockFirestoreFunctions as any;
});

describe('PredefinedFinesService', () => {
  let mockFirestore: Firestore;
  let service: PredefinedFinesService;

  const TEAM_ID = 'team-1';

  beforeEach(() => {
    clearMockDocuments();
    vi.clearAllMocks();
    mockFirestore = createMockFirestore();
    service = new PredefinedFinesService(mockFirestore, TEAM_ID);
  });

  afterEach(() => {
    clearMockDocuments();
  });

  describe('Constructor', () => {
    it('should initialize with correct collection path', () => {
      expect((service as any).collectionName).toBe(`teams/${TEAM_ID}/predefinedFines`);
    });

    it('should store the teamId', () => {
      expect((service as any).teamId).toBe(TEAM_ID);
    });
  });

  describe('create()', () => {
    it('should create a predefined fine with correct fields', async () => {
      const data = { reason: 'Late for training', amount: 5.00, teamId: TEAM_ID };

      const result = await service.create(data);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.reason).toBe('Late for training');
      expect(result.data!.amount).toBe(5.00);
      expect(result.data!.teamId).toBe(TEAM_ID);
      expect(result.data!.id).toBeDefined();
      expect(result.data!.createdAt).toBeDefined();
      expect(result.data!.updatedAt).toBeDefined();
    });

    it('should use a custom ID when provided', async () => {
      const data = { reason: 'Red card', amount: 20.00, teamId: TEAM_ID };

      const result = await service.create(data, { customId: 'custom-pf-1' });

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('custom-pf-1');
    });
  });

  describe('getAll()', () => {
    it('should return all predefined fines for the team', async () => {
      setMockDocument(`teams/${TEAM_ID}/predefinedFines/pf1`, {
        id: 'pf1', reason: 'Late for training', amount: 5.00, teamId: TEAM_ID,
      });
      setMockDocument(`teams/${TEAM_ID}/predefinedFines/pf2`, {
        id: 'pf2', reason: 'Red card', amount: 20.00, teamId: TEAM_ID,
      });

      const result = await service.getAll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array when no predefined fines exist', async () => {
      const result = await service.getAll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getById()', () => {
    it('should return a predefined fine by ID', async () => {
      setMockDocument(`teams/${TEAM_ID}/predefinedFines/pf1`, {
        id: 'pf1', reason: 'Late for training', amount: 5.00, teamId: TEAM_ID,
      });

      const result = await service.getById('pf1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.reason).toBe('Late for training');
    });

    it('should return error for non-existent ID', async () => {
      const result = await service.getById('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('update()', () => {
    it('should update reason and amount', async () => {
      setMockDocument(`teams/${TEAM_ID}/predefinedFines/pf1`, {
        id: 'pf1', reason: 'Late for training', amount: 5.00, teamId: TEAM_ID,
      });

      const result = await service.update('pf1', { reason: 'Late for game', amount: 10.00 });

      expect(result.success).toBe(true);
      const stored = getMockDocument(`teams/${TEAM_ID}/predefinedFines/pf1`);
      expect(stored.reason).toBe('Late for game');
      expect(stored.amount).toBe(10.00);
    });
  });

  describe('delete()', () => {
    it('should remove a predefined fine', async () => {
      setMockDocument(`teams/${TEAM_ID}/predefinedFines/pf1`, {
        id: 'pf1', reason: 'Late for training', amount: 5.00, teamId: TEAM_ID,
      });

      const result = await service.delete('pf1');

      expect(result.success).toBe(true);
      const stored = getMockDocument(`teams/${TEAM_ID}/predefinedFines/pf1`);
      expect(stored).toBeUndefined();
    });
  });

  describe('seedDefaults()', () => {
    it('should create 7 default predefined fines', async () => {
      const result = await service.seedDefaults();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(7);
    });

    it('should include all expected default reasons', async () => {
      const result = await service.seedDefaults();

      expect(result.success).toBe(true);
      const reasons = result.data!.map((f: PredefinedFine) => f.reason);
      expect(reasons).toContain('Late for training');
      expect(reasons).toContain('Late for game');
      expect(reasons).toContain('Yellow card (foul)');
      expect(reasons).toContain('Yellow card (dissent)');
      expect(reasons).toContain('Red card');
      expect(reasons).toContain('Forgot equipment');
      expect(reasons).toContain('Phone in locker room');
    });

    it('should set correct amounts for defaults', async () => {
      const result = await service.seedDefaults();

      expect(result.success).toBe(true);
      const fineMap = new Map(result.data!.map((f: PredefinedFine) => [f.reason, f.amount]));
      expect(fineMap.get('Late for training')).toBe(5.00);
      expect(fineMap.get('Red card')).toBe(20.00);
      expect(fineMap.get('Phone in locker room')).toBe(1.00);
    });

    it('should set teamId on all seeded fines', async () => {
      const result = await service.seedDefaults();

      expect(result.success).toBe(true);
      for (const fine of result.data!) {
        expect(fine.teamId).toBe(TEAM_ID);
      }
    });

    it('should be idempotent — calling twice returns 7 fines, not 14', async () => {
      const first = await service.seedDefaults();
      expect(first.success).toBe(true);
      expect(first.data).toHaveLength(7);

      const second = await service.seedDefaults();
      expect(second.success).toBe(true);
      expect(second.data).toHaveLength(7);

      // Verify total documents in the collection is still 7
      const all = await service.getAll();
      expect(all.success).toBe(true);
      expect(all.data).toHaveLength(7);
    });
  });

  describe('Error handling', () => {
    it('should wrap Firestore errors in ServiceResult', async () => {
      // Force an error by mocking setDoc to throw
      const { setDoc } = await import('firebase/firestore');
      (setDoc as any).mockRejectedValueOnce(new Error('Firestore write failed'));

      const result = await service.create({
        reason: 'Test', amount: 1.00, teamId: TEAM_ID,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Firestore write failed');
    });
  });
});
