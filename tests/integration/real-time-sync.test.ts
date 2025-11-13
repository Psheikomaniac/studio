/**
 * Integration Tests: Real-time Firestore Sync
 * Tests Firestore snapshot listeners and real-time data synchronization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestFirestore } from './setup';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { seedPlayer, seedFine, clearCollection } from './helpers/seed-data';
import { createPlayer, createFine } from './helpers/test-builders';
import { PlayersService } from '@/services/players.service';
import { FinesService } from '@/services/fines.service';

describe('Integration: Real-time Sync', () => {
  let firestore: ReturnType<typeof getTestFirestore>;
  const testPlayerId = 'test-player-1';

  beforeEach(async () => {
    firestore = getTestFirestore();

    // Clean up
    await clearCollection(firestore, 'users');
  });

  describe('Firestore Snapshot Listeners', () => {
    it('should receive real-time updates when player is added (Given-When-Then)', async () => {
      return new Promise<void>(async (resolve, reject) => {
        // Given: Listening to players collection
        const playersQuery = query(collection(firestore, 'users'), orderBy('name', 'asc'));
        let updateCount = 0;

        const unsubscribe = onSnapshot(
          playersQuery,
          (snapshot) => {
            updateCount++;

            if (updateCount === 1) {
              // First callback - initial empty state
              expect(snapshot.size).toBe(0);
            } else if (updateCount === 2) {
              // Second callback - after player added
              expect(snapshot.size).toBe(1);
              const playerData = snapshot.docs[0].data();
              expect(playerData.name).toBe('Real-time Test Player');

              unsubscribe();
              resolve();
            }
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );

        // When: Adding a player after listener is set up
        setTimeout(async () => {
          const player = createPlayer(testPlayerId)
            .withName('Real-time Test Player')
            .build();
          await seedPlayer(firestore, player);
        }, 100);

        // Timeout to prevent hanging
        setTimeout(() => {
          unsubscribe();
          reject(new Error('Test timed out'));
        }, 5000);
      });
    });

    it('should receive updates when player is modified', async () => {
      return new Promise<void>(async (resolve, reject) => {
        // Given: Existing player and listener
        const player = createPlayer(testPlayerId).withName('Original Name').build();
        await seedPlayer(firestore, player);

        const playersService = new PlayersService(firestore);
        const playersQuery = query(collection(firestore, 'users'));
        let updateCount = 0;

        const unsubscribe = onSnapshot(
          playersQuery,
          async (snapshot) => {
            updateCount++;

            if (updateCount === 1) {
              // Initial state
              expect(snapshot.size).toBe(1);
              const playerData = snapshot.docs[0].data();
              expect(playerData.name).toBe('Original Name');

              // When: Updating the player
              setTimeout(async () => {
                await playersService.updatePlayer(testPlayerId, {
                  name: 'Updated Name',
                });
              }, 100);
            } else if (updateCount === 2) {
              // After update
              expect(snapshot.size).toBe(1);
              const playerData = snapshot.docs[0].data();
              expect(playerData.name).toBe('Updated Name');

              unsubscribe();
              resolve();
            }
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );

        setTimeout(() => {
          unsubscribe();
          reject(new Error('Test timed out'));
        }, 5000);
      });
    });

    it('should receive updates when document is deleted', async () => {
      return new Promise<void>(async (resolve, reject) => {
        // Given: Existing player
        const player = createPlayer(testPlayerId).withName('To Delete').build();
        await seedPlayer(firestore, player);

        const playersService = new PlayersService(firestore);
        const playersQuery = query(collection(firestore, 'users'));
        let updateCount = 0;

        const unsubscribe = onSnapshot(
          playersQuery,
          async (snapshot) => {
            updateCount++;

            if (updateCount === 1) {
              // Initial state
              expect(snapshot.size).toBe(1);

              // When: Deleting the player
              setTimeout(async () => {
                await playersService.deletePlayer(testPlayerId, { soft: false });
              }, 100);
            } else if (updateCount === 2) {
              // After deletion
              expect(snapshot.size).toBe(0);

              unsubscribe();
              resolve();
            }
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );

        setTimeout(() => {
          unsubscribe();
          reject(new Error('Test timed out'));
        }, 5000);
      });
    });
  });

  describe('Nested Collection Listeners', () => {
    it('should receive updates for nested fines collection', async () => {
      return new Promise<void>(async (resolve, reject) => {
        // Given: Player and listening to fines
        const player = createPlayer(testPlayerId).withName('Fines Test').build();
        await seedPlayer(firestore, player);

        const finesQuery = query(
          collection(firestore, `users/${testPlayerId}/fines`),
          orderBy('date', 'desc')
        );
        let updateCount = 0;

        const unsubscribe = onSnapshot(
          finesQuery,
          (snapshot) => {
            updateCount++;

            if (updateCount === 1) {
              // Initial empty state
              expect(snapshot.size).toBe(0);
            } else if (updateCount === 2) {
              // After fine added
              expect(snapshot.size).toBe(1);
              const fineData = snapshot.docs[0].data();
              expect(fineData.reason).toBe('Test Fine');

              unsubscribe();
              resolve();
            }
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );

        // When: Adding a fine
        setTimeout(async () => {
          const fine = createFine(testPlayerId).withReason('Test Fine').build();
          await seedFine(firestore, testPlayerId, fine);
        }, 100);

        setTimeout(() => {
          unsubscribe();
          reject(new Error('Test timed out'));
        }, 5000);
      });
    });

    it('should handle multiple simultaneous listeners', async () => {
      return new Promise<void>(async (resolve, reject) => {
        // Given: Two listeners on different collections
        const player = createPlayer(testPlayerId).withName('Multi Listener Test').build();
        await seedPlayer(firestore, player);

        const playersQuery = query(collection(firestore, 'users'));
        const finesQuery = query(collection(firestore, `users/${testPlayerId}/fines`));

        let playersUpdates = 0;
        let finesUpdates = 0;

        const unsubscribePlayers = onSnapshot(playersQuery, () => {
          playersUpdates++;
        });

        const unsubscribeFines = onSnapshot(finesQuery, (snapshot) => {
          finesUpdates++;

          if (finesUpdates === 2) {
            // After fine added
            expect(snapshot.size).toBe(1);
            expect(playersUpdates).toBeGreaterThanOrEqual(1);

            unsubscribePlayers();
            unsubscribeFines();
            resolve();
          }
        });

        // When: Adding a fine
        setTimeout(async () => {
          const fine = createFine(testPlayerId).withAmount(10).build();
          await seedFine(firestore, testPlayerId, fine);
        }, 100);

        setTimeout(() => {
          unsubscribePlayers();
          unsubscribeFines();
          reject(new Error('Test timed out'));
        }, 5000);
      });
    });
  });

  describe('Listener Cleanup', () => {
    it('should stop receiving updates after unsubscribe', async () => {
      return new Promise<void>(async (resolve, reject) => {
        // Given: Listener that will be unsubscribed
        const playersQuery = query(collection(firestore, 'users'));
        let updateCount = 0;

        const unsubscribe = onSnapshot(playersQuery, (snapshot) => {
          updateCount++;

          if (updateCount === 1) {
            // Initial empty state
            expect(snapshot.size).toBe(0);

            // When: Unsubscribing immediately
            unsubscribe();

            // Then: Add a player - should not trigger callback
            setTimeout(async () => {
              const player = createPlayer('test').withName('Test').build();
              await seedPlayer(firestore, player);

              // Wait a bit to ensure no callback
              setTimeout(() => {
                expect(updateCount).toBe(1); // Should still be 1
                resolve();
              }, 500);
            }, 100);
          } else {
            // Should not reach here
            reject(new Error('Received update after unsubscribe'));
          }
        });

        setTimeout(() => {
          reject(new Error('Test timed out'));
        }, 5000);
      });
    });
  });

  describe('Connection Handling', () => {
    it('should handle listener errors gracefully', async () => {
      return new Promise<void>((resolve, reject) => {
        // Given: Listener with invalid query (non-existent field)
        const invalidQuery = query(
          collection(firestore, 'users'),
          orderBy('nonExistentField')
        );

        const unsubscribe = onSnapshot(
          invalidQuery,
          () => {
            // Should not reach here with invalid field
            unsubscribe();
            reject(new Error('Should have received error'));
          },
          (error) => {
            // Then: Error callback should be called
            expect(error).toBeDefined();
            unsubscribe();
            resolve();
          }
        );

        setTimeout(() => {
          unsubscribe();
          reject(new Error('Test timed out'));
        }, 5000);
      });
    });
  });
});
