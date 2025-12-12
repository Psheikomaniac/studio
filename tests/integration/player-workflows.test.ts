/**
 * Integration Tests: Player Workflows
 * Tests complete player lifecycle workflows with real Firestore operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestFirestore } from './setup';
import { PlayersService } from '@/services/players.service';
import { FinesService } from '@/services/fines.service';
import { PaymentsService } from '@/services/payments.service';
import { BalanceService } from '@/services/balance.service';
import {
  seedTeamPlayer,
  clearCollection,
  seedTeamFine,
  seedTeamPayment,
  seedTeam,
} from './helpers/seed-data';
import { createPlayer, createFine, createPayment } from './helpers/test-builders';
import { getDocs, collection } from 'firebase/firestore';

describe('Integration: Player Workflows', () => {
  let firestore: ReturnType<typeof getTestFirestore>;
  let playersService: PlayersService;
  let balanceService: BalanceService;
  const TEAM_ID = 'team-integration-1';

  beforeEach(async () => {
    firestore = getTestFirestore();
    playersService = new PlayersService(firestore, TEAM_ID);
    balanceService = new BalanceService();

    // Clean up before each test
    await clearCollection(firestore, 'teams');

    // Ensure parent team doc exists so cleanup can reliably delete nested data in the in-memory mock.
    await seedTeam(firestore, TEAM_ID);
  });

  describe('Player Creation Workflow', () => {
    it('should create a new player with default values (Given-When-Then)', async () => {
      // Given: No existing players
      const playerData = {
        name: 'John Doe',
        nickname: 'JD',
        photoUrl: 'https://example.com/photo.jpg',
        balance: 0,
        totalUnpaidPenalties: 0,
        totalPaidPenalties: 0,
      };

      // When: Creating a new player
      const result = await playersService.createPlayer(playerData);

      // Then: Player should be created successfully
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('John Doe');
      expect(result.data?.nickname).toBe('JD');
      expect(result.data?.active).toBe(true); // Default value

      // Verify in Firestore
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      expect(playersSnapshot.size).toBe(1);
      const userData = playersSnapshot.docs[0].data();
      expect(userData.name).toBe('John Doe');
      expect(userData.active).toBe(true);
    });

    it('should create multiple players and retrieve them all', async () => {
      // Given: Creating three players
      await playersService.createPlayer({
        name: 'Alice',
        nickname: 'Ali',
        photoUrl: 'https://example.com/alice.jpg',
        balance: 0,
        totalUnpaidPenalties: 0,
        totalPaidPenalties: 0,
      });

      await playersService.createPlayer({
        name: 'Bob',
        nickname: 'Bobby',
        photoUrl: 'https://example.com/bob.jpg',
        balance: 0,
        totalUnpaidPenalties: 0,
        totalPaidPenalties: 0,
      });

      await playersService.createPlayer({
        name: 'Charlie',
        nickname: 'Chuck',
        photoUrl: 'https://example.com/charlie.jpg',
        balance: 0,
        totalUnpaidPenalties: 0,
        totalPaidPenalties: 0,
      });

      // When: Retrieving all players
      const result = await playersService.getAll();

      // Then: All three players should be returned
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data?.map(p => p.name).sort()).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should create a player with custom ID', async () => {
      // Given: Custom player ID
      const customId = 'custom-player-123';

      // When: Creating player with custom ID
      const result = await playersService.createPlayer(
        {
          name: 'Custom Player',
          nickname: 'Custom',
          photoUrl: 'https://example.com/custom.jpg',
          balance: 0,
          totalUnpaidPenalties: 0,
          totalPaidPenalties: 0,
        },
        { customId }
      );

      // Then: Player should have the custom ID
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(customId);
    });
  });

  describe('Player Update Workflow', () => {
    it('should update player information', async () => {
      // Given: An existing player
      const player = createPlayer('player1').withName('Old Name').build();
      await seedTeamPlayer(firestore, TEAM_ID, player);

      // When: Updating the player's name
      const result = await playersService.updatePlayer(player.id, {
        name: 'New Name',
        nickname: 'New',
      });

      // Then: Player should be updated
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('New Name');
      expect(result.data?.nickname).toBe('New');

      // Verify update time was set
      expect(result.data?.updatedAt).toBeDefined();
    });

    it('should mark player as inactive', async () => {
      // Given: An active player
      const player = createPlayer('player1').withName('Active Player').build();
      await seedTeamPlayer(firestore, TEAM_ID, player);

      // When: Marking player as inactive
      const result = await playersService.updatePlayer(player.id, {
        active: false,
      });

      // Then: Player should be inactive
      expect(result.success).toBe(true);
      expect(result.data?.active).toBe(false);
    });
  });

  describe('Player Deletion Workflow', () => {
    it('should soft delete a player', async () => {
      // Given: An existing player
      const player = createPlayer('player1').withName('To Delete').build();
      await seedTeamPlayer(firestore, TEAM_ID, player);

      // When: Soft deleting the player
      const result = await playersService.deletePlayer(player.id, { soft: true });

      // Then: Player should be marked as deleted
      expect(result.success).toBe(true);

      const retrieveResult = await playersService.getById(player.id);
      expect(retrieveResult.success).toBe(true);
      expect((retrieveResult.data as any)?.deleted).toBe(true);
      expect((retrieveResult.data as any)?.deletedAt).toBeDefined();
    });

    it('should hard delete a player', async () => {
      // Given: An existing player
      const player = createPlayer('player1').withName('To Delete Hard').build();
      await seedTeamPlayer(firestore, TEAM_ID, player);

      // When: Hard deleting the player
      const result = await playersService.deletePlayer(player.id, { soft: false });

      // Then: Player should be removed from Firestore
      expect(result.success).toBe(true);

      const retrieveResult = await playersService.getById(player.id);
      expect(retrieveResult.success).toBe(false);
      expect(retrieveResult.data).toBeUndefined();
    });
  });

  describe('Complete Player Workflow: Create → Add Fine → Add Payment', () => {
    it('should complete full workflow with balance calculation', async () => {
      // Given: Create a new player
      const createResult = await playersService.createPlayer({
        name: 'Test Player',
        nickname: 'Test',
        photoUrl: 'https://example.com/test.jpg',
        balance: 0,
        totalUnpaidPenalties: 0,
        totalPaidPenalties: 0,
      });
      expect(createResult.success).toBe(true);
      const playerId = createResult.data!.id;

      // When: Add a payment (credit)
      const paymentsService = new PaymentsService(firestore, TEAM_ID, playerId);
      const payment = createPayment(playerId).withAmount(100).build();
      await seedTeamPayment(firestore, TEAM_ID, playerId, { ...payment, teamId: TEAM_ID, userId: playerId });

      // When: Add a fine (debit)
      const finesService = new FinesService(firestore, TEAM_ID, playerId);
      const fine = createFine(playerId).withAmount(15).build();
      await seedTeamFine(firestore, TEAM_ID, playerId, { ...fine, teamId: TEAM_ID, userId: playerId });

      // Then: Calculate balance
      const fines = await finesService.getAll();
      const payments = await paymentsService.getAll();

      expect(fines.success).toBe(true);
      expect(payments.success).toBe(true);

      const balance = balanceService.calculatePlayerBalance(
        playerId,
        payments.data || [],
        fines.data || [],
        [],
        []
      );

      // Balance should be 100 (payment) - 15 (fine) = 85
      expect(balance).toBe(85);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous player creations', async () => {
      // Given: Multiple player creation requests
      const creationPromises = Array.from({ length: 5 }, (_, i) =>
        playersService.createPlayer({
          name: `Player ${i + 1}`,
          nickname: `P${i + 1}`,
          photoUrl: `https://example.com/player${i + 1}.jpg`,
          balance: 0,
          totalUnpaidPenalties: 0,
          totalPaidPenalties: 0,
        })
      );

      // When: Creating all players concurrently
      const results = await Promise.all(creationPromises);

      // Then: All players should be created successfully
      expect(results.every(r => r.success)).toBe(true);
      expect(results.map(r => r.data?.name)).toHaveLength(5);

      // Verify all are in Firestore
      const allPlayers = await playersService.getAll();
      expect(allPlayers.data).toHaveLength(5);
    });

    it('should handle concurrent updates to the same player', async () => {
      // Given: An existing player
      const player = createPlayer('player1').withName('Original').build();
      await seedTeamPlayer(firestore, TEAM_ID, player);

      // When: Multiple concurrent updates
      const updatePromises = [
        playersService.updatePlayer(player.id, { nickname: 'Update1' }),
        playersService.updatePlayer(player.id, { email: 'test@example.com' }),
        playersService.updatePlayer(player.id, { phone: '+1234567890' }),
      ];

      const results = await Promise.all(updatePromises);

      // Then: All updates should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Final state should have all updates
      const finalPlayer = await playersService.getById(player.id);
      expect(finalPlayer.data?.nickname).toBeDefined();
      expect(finalPlayer.data?.email).toBeDefined();
      expect(finalPlayer.data?.phone).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetching non-existent player', async () => {
      // Given: Non-existent player ID
      const nonExistentId = 'non-existent-player';

      // When: Fetching the player
      const result = await playersService.getById(nonExistentId);

      // Then: Should return failure
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
    });

    it('should handle updating non-existent player', async () => {
      // Given: Non-existent player ID
      const nonExistentId = 'non-existent-player';

      // When: Updating the player
      const result = await playersService.updatePlayer(nonExistentId, {
        name: 'New Name',
      });

      // Then: Should return failure
      expect(result.success).toBe(false);
    });

    it('should handle deleting non-existent player', async () => {
      // Given: Non-existent player ID
      const nonExistentId = 'non-existent-player';

      // When: Deleting the player
      const result = await playersService.deletePlayer(nonExistentId);

      // Then: Should return failure
      expect(result.success).toBe(false);
    });
  });
});
