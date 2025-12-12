/**
 * BeveragesService Unit Tests
 *
 * CRITICAL BUSINESS LOGIC TESTED:
 * - Beverage consumptions are stored in nested collections: /teams/{teamId}/players/{playerId}/beverageConsumptions/{id}
 * - Auto-payment logic based on provided playerBalance
 * - Player balance is updated atomically via transaction on /teams/{teamId}/players/{playerId}
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BeveragesService } from '@/services/beverages.service';
import type { Firestore } from 'firebase/firestore';
import type { BeverageConsumption } from '@/lib/types';
import {
  createMockFirestore,
  clearMockDocuments,
  mockFirestoreFunctions,
  setMockDocument,
  getMockDocument,
} from '../../mocks/firestore-mock';

// Mock Firebase Firestore module (use dynamic import inside factory to avoid hoist issues)
vi.mock('firebase/firestore', async () => {
  const mocks = await import('../../mocks/firestore-mock');
  return mocks.mockFirestoreFunctions as any;
});

describe('BeveragesService', () => {
  let mockFirestore: Firestore;
  let service: BeveragesService;

  const TEAM_ID = 'team-1';
  const PLAYER_ID = 'player-1';

  beforeEach(() => {
    clearMockDocuments();
    vi.clearAllMocks();
    mockFirestore = createMockFirestore();
    service = new BeveragesService(mockFirestore, TEAM_ID, PLAYER_ID);
  });

  afterEach(() => {
    clearMockDocuments();
  });

  describe('Constructor', () => {
    it('should initialize with correct collection name', () => {
      expect((service as any).collectionName).toBe(`teams/${TEAM_ID}/players/${PLAYER_ID}/beverageConsumptions`);
      expect((service as any).teamId).toBe(TEAM_ID);
      expect((service as any).playerId).toBe(PLAYER_ID);
    });
  });

  describe('createConsumption (auto-payment + balance update)', () => {
    it('should create unpaid consumption when playerBalance <= 0 and decrement player balance by amount', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 0 });

      const data: Omit<BeverageConsumption, 'id' | 'createdAt' | 'paid' | 'paidAt' | 'amountPaid'> = {
        userId: PLAYER_ID,
        beverageId: 'bev-1',
        beverageName: 'Beer',
        amount: 2.5,
        date: '2024-01-01T00:00:00.000Z',
        paid: false,
        createdAt: 'x',
      } as any;

      const result = await service.createConsumption(data, { playerBalance: 0 });

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBeUndefined();
      expect(result.data?.userId).toBe(PLAYER_ID);
      expect(result.data?.teamId).toBe(TEAM_ID);

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBeCloseTo(-2.5);
    });

    it('should auto-pay consumption when playerBalance >= amount', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 10 });

      const data: Omit<BeverageConsumption, 'id' | 'createdAt' | 'paid' | 'paidAt' | 'amountPaid'> = {
        userId: PLAYER_ID,
        beverageId: 'bev-2',
        beverageName: 'Water',
        amount: 1,
        date: '2024-01-02T00:00:00.000Z',
      } as any;

      const result = await service.createConsumption(data, { playerBalance: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.amountPaid).toBe(1);
      expect(result.data?.paidAt).toBeDefined();
      expect(mockFirestoreFunctions.runTransaction).toHaveBeenCalled();

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBe(9);
    });

    it('should partially pay consumption when 0 < playerBalance < amount', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 0.5 });

      const data: Omit<BeverageConsumption, 'id' | 'createdAt' | 'paid' | 'paidAt' | 'amountPaid'> = {
        userId: PLAYER_ID,
        beverageId: 'bev-3',
        beverageName: 'Cola',
        amount: 2,
        date: '2024-01-03T00:00:00.000Z',
      } as any;

      const result = await service.createConsumption(data, { playerBalance: 0.5 });

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBe(0.5);

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBeCloseTo(-1.5);
    });
  });

  describe('toggleConsumptionPaid (transactional + balance adjustment)', () => {
    it('should mark unpaid consumption as paid and credit remaining debit back to balance', async () => {
      const consumptionId = 'cons-1';
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: -2 });
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}/beverageConsumptions/${consumptionId}`, {
        id: consumptionId,
        userId: PLAYER_ID,
        teamId: TEAM_ID,
        beverageId: 'bev-3',
        beverageName: 'Cola',
        amount: 2,
        date: '2024-01-03T00:00:00.000Z',
        paid: false,
        amountPaid: 0,
        createdAt: '2024-01-03T00:00:00.000Z',
      } satisfies any);

      const result = await service.toggleConsumptionPaid(consumptionId, true);

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(mockFirestoreFunctions.runTransaction).toHaveBeenCalled();

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBe(0);
    });
  });
});
