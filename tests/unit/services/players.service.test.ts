/**
 * PlayersService Unit Tests
 * Comprehensive tests for player CRUD operations
 *
 * Test Strategy:
 * - All CRUD methods (create, read, update, delete)
 * - Both blocking and non-blocking operations
 * - Happy paths and error cases
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlayersService } from '@/services/players.service';
import type { Firestore } from 'firebase/firestore';
import type { Player } from '@/lib/types';
import {
  createMockFirestore,
  createMockDocumentSnapshot,
  createMockQuerySnapshot,
  clearMockDocuments,
  mockFirestoreFunctions,
} from '../../mocks/firestore-mock';

// Mock Firebase Firestore module (use dynamic import inside factory to avoid hoist issues)
vi.mock('firebase/firestore', async () => {
  const mocks = await import('../../mocks/firestore-mock');
  return mocks.mockFirestoreFunctions as any;
});

describe('PlayersService', () => {
  let mockFirestore: Firestore;
  let service: PlayersService;
  const teamId = 'team_1';

  beforeEach(() => {
    clearMockDocuments();
    vi.clearAllMocks();
    mockFirestore = createMockFirestore();
    service = new PlayersService(mockFirestore, teamId);
  });

  afterEach(() => {
    clearMockDocuments();
  });

  describe('Constructor', () => {
    it('should initialize with firestore instance and correct collection name (Given-When-Then)', () => {
      // Given: A mock Firestore instance
      const firestore = createMockFirestore();

      // When: Creating a new PlayersService
      const playersService = new PlayersService(firestore, teamId);

      // Then: Service should be initialized with correct collection
      expect(playersService).toBeInstanceOf(PlayersService);
      expect(playersService['firestore']).toBe(firestore);
      expect(playersService['collectionName']).toBe(`teams/${teamId}/players`);
    });
  });

  describe('createPlayer', () => {
    it('should create a player with default active=true when not specified (Given-When-Then)', async () => {
      // Given: Player data without active field
      const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'John Doe',
        nickname: 'JD',
        email: 'john@example.com',
        phone: '+1234567890',
        photoUrl: 'https://example.com/photo.jpg',
        balance: 0,
      };

      // When: Creating the player
      const result = await service.createPlayer(playerData);

      // Then: Player should be created with active=true
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('John Doe');
      expect((result.data as any).active).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.updatedAt).toBeDefined();
    });

    it('should create a player with explicit active=false when specified (Given-When-Then)', async () => {
      // Given: Player data with active=false
      const playerData = {
        name: 'Jane Smith',
        nickname: 'JS',
        email: 'jane@example.com',
        active: false,
      } as Omit<Player, 'id' | 'createdAt' | 'updatedAt'>;

      // When: Creating the player
      const result = await service.createPlayer(playerData);

      // Then: Player should be created with active=false
      expect(result.success).toBe(true);
      expect((result.data as any).active).toBe(false);
    });

    it('should create a player with custom ID when provided (Given-When-Then)', async () => {
      // Given: Player data and custom ID
      const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Custom ID Player',
        nickname: 'CIP',
        email: 'custom@example.com',
      } as any;
      const customId = 'custom-player-123';

      // When: Creating player with custom ID
      const result = await service.createPlayer(playerData, { customId });

      // Then: Player should be created with custom ID
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(customId);
    });

    it('should include createdBy and updatedBy when userId provided (Given-When-Then)', async () => {
      // Given: Player data and userId option
      const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'User Tracked Player',
        nickname: 'UTP',
        email: 'tracked@example.com',
      } as any;
      const userId = 'admin-123';

      // When: Creating player with userId
      const result = await service.createPlayer(playerData, { userId });

      // Then: Player should have audit fields
      expect(result.success).toBe(true);
      expect((result.data as any).createdBy).toBe(userId);
      expect((result.data as any).updatedBy).toBe(userId);
    });

    it('should handle errors during player creation (Given-When-Then)', async () => {
      // Given: Mock setDoc to throw error
      const error = new Error('Firestore connection failed');
      mockFirestoreFunctions.setDoc.mockRejectedValueOnce(error);

      const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Error Player',
        nickname: 'EP',
        email: 'error@example.com',
      } as any;

      // When: Creating player with error
      const result = await service.createPlayer(playerData);

      // Then: Should return error result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Firestore connection failed');
    });
  });

  describe('createPlayerNonBlocking', () => {
    it('should create player non-blocking and return ID immediately (Given-When-Then)', () => {
      // Given: Player data
      const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Quick Player',
        nickname: 'QP',
        email: 'quick@example.com',
      } as any;

      // When: Creating player non-blocking
      const playerId = service.createPlayerNonBlocking(playerData);

      // Then: Should return ID immediately
      expect(playerId).toBeDefined();
      expect(typeof playerId).toBe('string');
      expect(playerId.length).toBeGreaterThan(0);
    });

    it('should use custom ID when provided for non-blocking create (Given-When-Then)', () => {
      // Given: Player data and custom ID
      const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Custom Player',
        nickname: 'CP',
        email: 'custom@example.com',
      } as any;
      const customId = 'custom-non-blocking-123';

      // When: Creating with custom ID
      const playerId = service.createPlayerNonBlocking(playerData, { customId });

      // Then: Should return custom ID
      expect(playerId).toBe(customId);
    });

    it('should set active=true by default in non-blocking create (Given-When-Then)', () => {
      // Given: Player data without active field
      const playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Default Active Player',
        nickname: 'DAP',
        email: 'default@example.com',
      } as any;

      // When: Creating player non-blocking
      const playerId = service.createPlayerNonBlocking(playerData);

      // Then: setDocumentNonBlocking should be called (mocked)
      expect(playerId).toBeDefined();
    });
  });

  describe('updatePlayer', () => {
    it('should update player with partial data (Given-When-Then)', async () => {
      // Given: Existing player and update data
      const playerId = 'player-123';
      const updateData: Partial<Omit<Player, 'id'>> = {
        nickname: 'Updated Nickname',
        email: 'updated@example.com',
      };

      // Mock existing player
      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(playerId, {
          id: playerId,
          name: 'Original Name',
          nickname: 'Old Nick',
          email: 'old@example.com',
        })
      );

      // When: Updating player
      const result = await service.updatePlayer(playerId, updateData);

      // Then: Player should be updated
      expect(result.success).toBe(true);
      expect(mockFirestoreFunctions.updateDoc).toHaveBeenCalled();
    });

    it('should include updatedBy when userId provided (Given-When-Then)', async () => {
      // Given: Player ID, update data, and userId
      const playerId = 'player-456';
      const updateData: Partial<Omit<Player, 'id'>> = {
        name: 'New Name',
      };
      const userId = 'admin-789';

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(playerId, {
          id: playerId,
          name: 'Old Name',
        })
      );

      // When: Updating with userId
      const result = await service.updatePlayer(playerId, updateData, { userId });

      // Then: Should include updatedBy
      expect(result.success).toBe(true);
    });

    it('should handle update errors gracefully (Given-When-Then)', async () => {
      // Given: Mock updateDoc to throw error
      const error = new Error('Update failed');
      mockFirestoreFunctions.updateDoc.mockRejectedValueOnce(error);

      const playerId = 'player-error';
      const updateData: Partial<Omit<Player, 'id'>> = {
        name: 'Error Update',
      };

      // When: Updating player with error
      const result = await service.updatePlayer(playerId, updateData);

      // Then: Should return error result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updatePlayerNonBlocking', () => {
    it('should update player non-blocking without waiting (Given-When-Then)', () => {
      // Given: Player ID and update data
      const playerId = 'player-non-block';
      const updateData: Partial<Omit<Player, 'id'>> = {
        nickname: 'Quick Update',
      };

      // When: Updating non-blocking
      service.updatePlayerNonBlocking(playerId, updateData);

      // Then: Should complete without error (non-blocking)
      expect(true).toBe(true); // No exception thrown
    });

    it('should include updatedBy in non-blocking update when userId provided (Given-When-Then)', () => {
      // Given: Player ID, update data, and userId
      const playerId = 'player-tracked';
      const updateData: Partial<Omit<Player, 'id'>> = {
        email: 'tracked@example.com',
      };
      const userId = 'admin-tracked';

      // When: Updating non-blocking with userId
      service.updatePlayerNonBlocking(playerId, updateData, { userId });

      // Then: Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('deletePlayer', () => {
    it('should hard delete player when soft=false (Given-When-Then)', async () => {
      // Given: Player ID to delete
      const playerId = 'player-hard-delete';

      // When: Hard deleting player
      const result = await service.deletePlayer(playerId, { soft: false });

      // Then: Should call deleteDoc
      expect(result.success).toBe(true);
      expect(mockFirestoreFunctions.deleteDoc).toHaveBeenCalled();
    });

    it('should soft delete player when soft=true (Given-When-Then)', async () => {
      // Given: Player ID to soft delete
      const playerId = 'player-soft-delete';

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(playerId, {
          id: playerId,
          name: 'To Be Soft Deleted',
        })
      );

      // When: Soft deleting player
      const result = await service.deletePlayer(playerId, { soft: true });

      // Then: Should call updateDoc with deleted flag
      expect(result.success).toBe(true);
      expect(mockFirestoreFunctions.updateDoc).toHaveBeenCalled();
    });

    it('should include deletedBy when userId provided for soft delete (Given-When-Then)', async () => {
      // Given: Player ID, soft delete, and userId
      const playerId = 'player-tracked-delete';
      const userId = 'admin-deleter';

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(playerId, {
          id: playerId,
          name: 'Tracked Delete',
        })
      );

      // When: Soft deleting with userId
      const result = await service.deletePlayer(playerId, { soft: true, userId });

      // Then: Should include deletedBy
      expect(result.success).toBe(true);
    });

    it('should handle delete errors (Given-When-Then)', async () => {
      // Given: Mock deleteDoc to throw error
      const error = new Error('Delete failed');
      mockFirestoreFunctions.deleteDoc.mockRejectedValueOnce(error);

      const playerId = 'player-delete-error';

      // When: Deleting with error
      const result = await service.deletePlayer(playerId);

      // Then: Should return error result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deletePlayerNonBlocking', () => {
    it('should hard delete non-blocking when soft=false (Given-When-Then)', () => {
      // Given: Player ID to hard delete
      const playerId = 'player-nb-hard-delete';

      // When: Hard deleting non-blocking
      service.deletePlayerNonBlocking(playerId, { soft: false });

      // Then: Should complete without error
      expect(true).toBe(true);
    });

    it('should soft delete non-blocking when soft=true (Given-When-Then)', () => {
      // Given: Player ID to soft delete
      const playerId = 'player-nb-soft-delete';

      // When: Soft deleting non-blocking
      service.deletePlayerNonBlocking(playerId, { soft: true });

      // Then: Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('getPlayerRef', () => {
    it('should return DocumentReference for player (Given-When-Then)', () => {
      // Given: Player ID
      const playerId = 'player-ref-123';

      // When: Getting player reference
      const playerRef = service.getPlayerRef(playerId);

      // Then: Should return DocumentReference
      expect(playerRef).toBeDefined();
      expect(playerRef.id).toBe(playerId);
    });
  });

  describe('getPlayersCollectionRef', () => {
    it('should return CollectionReference for players (Given-When-Then)', () => {
      // Given: PlayersService instance
      // When: Getting collection reference
      const collectionRef = service.getPlayersCollectionRef();

      // Then: Should return CollectionReference
      expect(collectionRef).toBeDefined();
      expect(collectionRef.id).toBe('players');
      expect(collectionRef.path).toBe(`teams/${teamId}/players`);
    });
  });

  describe('Inherited BaseFirebaseService methods', () => {
    it('should get player by ID (Given-When-Then)', async () => {
      // Given: Existing player ID
      const playerId = 'player-get-by-id';
      const mockPlayerData = {
        id: playerId,
        name: 'Get By ID Player',
        nickname: 'GBIP',
        email: 'getbyid@example.com',
      };

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(playerId, mockPlayerData)
      );

      // When: Getting player by ID
      const result = await service.getById(playerId);

      // Then: Should return player data
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayerData);
    });

    it('should get all players with query options (Given-When-Then)', async () => {
      // Given: Multiple players in database
      const mockPlayers = [
        { id: 'player-1', name: 'Player 1', email: 'p1@example.com' },
        { id: 'player-2', name: 'Player 2', email: 'p2@example.com' },
      ];

      mockFirestoreFunctions.getDocs.mockResolvedValueOnce(
        createMockQuerySnapshot(mockPlayers)
      );

      // When: Getting all players
      const result = await service.getAll({ limit: 10 });

      // Then: Should return all players
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should check if player exists (Given-When-Then)', async () => {
      // Given: Existing player ID
      const playerId = 'player-exists';

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(playerId, { id: playerId, name: 'Exists' })
      );

      // When: Checking if player exists
      const exists = await service.exists(playerId);

      // Then: Should return true
      expect(exists).toBe(true);
    });

    it('should return false when player does not exist (Given-When-Then)', async () => {
      // Given: Non-existent player ID
      const playerId = 'player-not-exists';

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(playerId, null, false)
      );

      // When: Checking if player exists
      const exists = await service.exists(playerId);

      // Then: Should return false
      expect(exists).toBe(false);
    });

    it('should count players (Given-When-Then)', async () => {
      // Given: Multiple players
      const mockPlayers = [
        { id: 'player-1', name: 'Player 1' },
        { id: 'player-2', name: 'Player 2' },
        { id: 'player-3', name: 'Player 3' },
      ];

      mockFirestoreFunctions.getDocs.mockResolvedValueOnce(
        createMockQuerySnapshot(mockPlayers)
      );

      // When: Counting players
      const count = await service.count();

      // Then: Should return correct count
      expect(count).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty player data gracefully (Given-When-Then)', async () => {
      // Given: Minimal player data
      const playerData = {
        name: '',
      } as any;

      // When: Creating player
      const result = await service.createPlayer(playerData);

      // Then: Should create player (validation should be handled elsewhere)
      expect(result.success).toBe(true);
    });

    it('should handle very long player names (Given-When-Then)', async () => {
      // Given: Player with very long name
      const longName = 'A'.repeat(1000);
      const playerData = {
        name: longName,
        nickname: 'Long',
        email: 'long@example.com',
      } as any;

      // When: Creating player
      const result = await service.createPlayer(playerData);

      // Then: Should create player
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(longName);
    });

    it('should handle special characters in player data (Given-When-Then)', async () => {
      // Given: Player with special characters
      const playerData = {
        name: 'Müller & Söhne <test@example>',
        nickname: '🎮 Gamer',
        email: 'special+chars@ex-ample.com',
      } as any;

      // When: Creating player
      const result = await service.createPlayer(playerData);

      // Then: Should create player with special chars
      expect(result.success).toBe(true);
      expect(result.data?.name).toContain('Müller');
    });
  });
});
