/**
 * FinesService Unit Tests
 *
 * CRITICAL BUSINESS LOGIC TESTED:
 * - Fines are stored in nested collections: /teams/{teamId}/players/{playerId}/fines/{fineId}
 * - Auto-payment logic based on provided playerBalance
 * - Player balance is updated atomically via transaction on /teams/{teamId}/players/{playerId}
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FinesService } from '@/services/fines.service';
import type { Firestore } from 'firebase/firestore';
import type { Fine } from '@/lib/types';
import { isBeverageFine } from '@/lib/types';
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

describe('FinesService', () => {
  let mockFirestore: Firestore;
  let service: FinesService;

  const TEAM_ID = 'team-1';
  const PLAYER_ID = 'player-1';

  beforeEach(() => {
    clearMockDocuments();
    vi.clearAllMocks();
    mockFirestore = createMockFirestore();
    service = new FinesService(mockFirestore, TEAM_ID, PLAYER_ID);
  });

  afterEach(() => {
    clearMockDocuments();
  });

  describe('Constructor', () => {
    it('should initialize with correct collection name', () => {
      expect((service as any).collectionName).toBe(`teams/${TEAM_ID}/players/${PLAYER_ID}/fines`);
      expect((service as any).teamId).toBe(TEAM_ID);
      expect((service as any).playerId).toBe(PLAYER_ID);
    });
  });

  describe('createFine (auto-payment + balance update)', () => {
    it('should create unpaid fine when playerBalance <= 0 and decrement player balance by amount', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 0 });

      const fineData: Omit<Fine, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt' | 'amountPaid'> = {
        userId: PLAYER_ID,
        reason: 'Late',
        amount: 10,
        date: '2024-01-01T00:00:00.000Z',
      };

      const result = await service.createFine(fineData, { playerBalance: 0 });

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBeUndefined();
      expect(result.data?.userId).toBe(PLAYER_ID);
      expect(result.data?.teamId).toBe(TEAM_ID);
      expect(mockFirestoreFunctions.runTransaction).toHaveBeenCalled();

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBe(-10);
    });

    it('should auto-pay fine when playerBalance >= amount (paid=true, amountPaid=amount) and decrement balance', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 50 });

      const fineData: Omit<Fine, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt' | 'amountPaid'> = {
        userId: PLAYER_ID,
        reason: 'Yellow card',
        amount: 10,
        date: '2024-01-02T00:00:00.000Z',
      };

      const result = await service.createFine(fineData, { playerBalance: 50 });

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.amountPaid).toBe(10);
      expect(result.data?.paidAt).toBeDefined();

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBe(40);
    });

    it('should partially pay fine when 0 < playerBalance < amount (paid=false, amountPaid=playerBalance)', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 5 });

      const fineData: Omit<Fine, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt' | 'amountPaid'> = {
        userId: PLAYER_ID,
        reason: 'Forgot equipment',
        amount: 10,
        date: '2024-01-03T00:00:00.000Z',
      };

      const result = await service.createFine(fineData, { playerBalance: 5 });

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBe(5);

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBe(-5);
    });
  });

  describe('createBeverageFine', () => {
    it('should create a fine with fineType=beverage and beverageId', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 0 });

      const beverage = { id: 'bev-1', name: 'Bier', price: 2.5 };
      const result = await service.createBeverageFine(
        beverage,
        '2024-01-10T18:00:00.000Z',
        { playerBalance: 0 }
      );

      expect(result.success).toBe(true);
      expect(result.data?.fineType).toBe('beverage');
      expect(result.data?.beverageId).toBe('bev-1');
      expect(result.data?.reason).toBe('Bier');
      expect(result.data?.amount).toBe(2.5);
      expect(result.data?.paid).toBe(false);
    });

    it('should auto-pay beverage fine when player has sufficient balance', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 10 });

      const beverage = { id: 'bev-2', name: 'Cola', price: 1.5 };
      const result = await service.createBeverageFine(
        beverage,
        '2024-01-10T18:00:00.000Z',
        { playerBalance: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.amountPaid).toBe(1.5);
      expect(result.data?.fineType).toBe('beverage');
    });

    it('should partially pay beverage fine when balance < price', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 1 });

      const beverage = { id: 'bev-3', name: 'Wasser', price: 2 };
      const result = await service.createBeverageFine(
        beverage,
        '2024-01-10T18:00:00.000Z',
        { playerBalance: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBe(1);
      expect(result.data?.fineType).toBe('beverage');
    });
  });

  describe('deleteFine (transactional + balance restore)', () => {
    it('should delete fine and restore amount to player balance', async () => {
      const fineId = 'fine-del-1';
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: -10 });
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}/fines/${fineId}`, {
        id: fineId,
        userId: PLAYER_ID,
        teamId: TEAM_ID,
        reason: 'Late',
        amount: 10,
        date: '2024-01-01T00:00:00.000Z',
        paid: false,
        amountPaid: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      } satisfies Fine);

      const result = await service.deleteFine(fineId);

      expect(result.success).toBe(true);
      expect(mockFirestoreFunctions.runTransaction).toHaveBeenCalled();

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBe(0);
    });

    it('should return error when fine does not exist', async () => {
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: 0 });

      const result = await service.deleteFine('nonexistent-fine');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Fine not found');
    });
  });

  describe('toggleFinePaid (transactional + balance adjustment)', () => {
    it('should mark unpaid fine as paid and credit the remaining debit back to player balance', async () => {
      const fineId = 'fine-1';
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`, { id: PLAYER_ID, balance: -10 });
      setMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}/fines/${fineId}`, {
        id: fineId,
        userId: PLAYER_ID,
        teamId: TEAM_ID,
        reason: 'Late',
        amount: 10,
        date: '2024-01-01T00:00:00.000Z',
        paid: false,
        amountPaid: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      } satisfies Fine);

      const result = await service.toggleFinePaid(fineId, true);

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(mockFirestoreFunctions.runTransaction).toHaveBeenCalled();

      const playerDoc = getMockDocument(`teams/${TEAM_ID}/players/${PLAYER_ID}`);
      expect(playerDoc.balance).toBe(0);
    });
  });

  describe('isBeverageFine helper', () => {
    it('should return true for fines with fineType=beverage', () => {
      const fine = { fineType: 'beverage' } as Fine;
      expect(isBeverageFine(fine)).toBe(true);
    });

    it('should return false for fines with fineType=regular', () => {
      const fine = { fineType: 'regular' } as Fine;
      expect(isBeverageFine(fine)).toBe(false);
    });

    it('should return false for fines without fineType (defaults to regular)', () => {
      const fine = {} as Fine;
      expect(isBeverageFine(fine)).toBe(false);
    });
  });
});
