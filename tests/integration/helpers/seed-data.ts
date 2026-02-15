/**
 * Seed Data Helpers for Integration Tests
 * Provides utilities for creating test data in Firestore emulator
 */

import {
  collection,
  doc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type {
  Player,
  Fine,
  Payment,
  Team,
  Due,
  DuePayment,
  Beverage,
  BeverageConsumption,
} from '@/lib/types';

function nowIso() {
  return new Date().toISOString();
}

/**
 * Ensure the team document exists (important for in-memory mock cleanup which lists only direct children).
 */
export async function seedTeam(
  firestore: Firestore,
  teamId: string,
  partial?: Partial<Team>
): Promise<string> {
  const t: Team = {
    id: teamId,
    name: partial?.name ?? 'Test Team',
    ownerUid: partial?.ownerUid ?? 'test-owner',
    inviteCode: partial?.inviteCode,
    archived: partial?.archived ?? false,
    createdAt: partial?.createdAt ?? nowIso(),
    updatedAt: partial?.updatedAt ?? nowIso(),
  };
  const teamRef = doc(firestore, 'teams', teamId);
  const batch = writeBatch(firestore);
  batch.set(teamRef, t as any);
  await batch.commit();
  return teamId;
}

/**
 * Seed a player into Firestore under a team scope
 * @param firestore Firestore instance
 * @param teamId Team ID
 * @param player Player data
 * @returns Player ID
 */
export async function seedTeamPlayer(
  firestore: Firestore,
  teamId: string,
  player: Player
): Promise<string> {
  // Ensure parent team exists so cleanup can find it.
  await seedTeam(firestore, teamId);
  const playerRef = doc(firestore, 'teams', teamId, 'players', player.id);
  const batch = writeBatch(firestore);
  batch.set(playerRef, player);
  await batch.commit();
  return player.id;
}

/**
 * Seed multiple players under a team scope
 */
export async function seedTeamPlayers(
  firestore: Firestore,
  teamId: string,
  players: Player[]
): Promise<string[]> {
  await seedTeam(firestore, teamId);
  const batch = writeBatch(firestore);

  players.forEach(player => {
    const playerRef = doc(firestore, 'teams', teamId, 'players', player.id);
    batch.set(playerRef, player);
  });

  await batch.commit();
  return players.map(p => p.id);
}

/**
 * Seed a fine into Firestore under a team-scoped player subcollection
 */
export async function seedTeamFine(
  firestore: Firestore,
  teamId: string,
  playerId: string,
  fine: Fine
): Promise<string> {
  await seedTeam(firestore, teamId);
  const fineRef = doc(firestore, `teams/${teamId}/players/${playerId}/fines`, fine.id);
  const batch = writeBatch(firestore);
  batch.set(fineRef, fine);
  await batch.commit();
  return fine.id;
}

export async function seedTeamFines(
  firestore: Firestore,
  teamId: string,
  playerId: string,
  fines: Fine[]
): Promise<string[]> {
  await seedTeam(firestore, teamId);
  const batch = writeBatch(firestore);

  fines.forEach(fine => {
    const fineRef = doc(firestore, `teams/${teamId}/players/${playerId}/fines`, fine.id);
    batch.set(fineRef, fine);
  });

  await batch.commit();
  return fines.map(f => f.id);
}

/**
 * Seed a payment into Firestore under a team-scoped player subcollection
 */
export async function seedTeamPayment(
  firestore: Firestore,
  teamId: string,
  playerId: string,
  payment: Payment
): Promise<string> {
  await seedTeam(firestore, teamId);
  const paymentRef = doc(firestore, `teams/${teamId}/players/${playerId}/payments`, payment.id);
  const batch = writeBatch(firestore);
  batch.set(paymentRef, payment);
  await batch.commit();
  return payment.id;
}

export async function seedTeamPayments(
  firestore: Firestore,
  teamId: string,
  playerId: string,
  payments: Payment[]
): Promise<string[]> {
  await seedTeam(firestore, teamId);
  const batch = writeBatch(firestore);

  payments.forEach(payment => {
    const paymentRef = doc(firestore, `teams/${teamId}/players/${playerId}/payments`, payment.id);
    batch.set(paymentRef, payment);
  });

  await batch.commit();
  return payments.map(p => p.id);
}

/**
 * Seed a due into Firestore
 * @param firestore Firestore instance
 * @param due Due data
 * @returns Due ID
 */
export async function seedDue(firestore: Firestore, due: Due): Promise<string> {
  const dueRef = doc(firestore, 'dues', due.id);
  const batch = writeBatch(firestore);
  batch.set(dueRef, due);
  await batch.commit();
  return due.id;
}

/**
 * Seed a due payment into Firestore under a team-scoped player subcollection
 * @param firestore Firestore instance
 * @param teamId Team ID
 * @param playerId Player ID
 * @param duePayment Due payment data
 * @returns Due payment ID
 */
export async function seedTeamDuePayment(
  firestore: Firestore,
  teamId: string,
  playerId: string,
  duePayment: DuePayment
): Promise<string> {
  await seedTeam(firestore, teamId);
  const duePaymentRef = doc(
    firestore,
    `teams/${teamId}/players/${playerId}/duePayments`,
    duePayment.id
  );
  const batch = writeBatch(firestore);
  batch.set(duePaymentRef, duePayment);
  await batch.commit();
  return duePayment.id;
}

/**
 * Seed a beverage into Firestore
 * @param firestore Firestore instance
 * @param beverage Beverage data
 * @returns Beverage ID
 */
export async function seedBeverage(firestore: Firestore, beverage: Beverage): Promise<string> {
  const beverageRef = doc(firestore, 'beverages', beverage.id);
  const batch = writeBatch(firestore);
  batch.set(beverageRef, beverage);
  await batch.commit();
  return beverage.id;
}

/**
 * Seed a beverage consumption into Firestore under a team-scoped player subcollection
 */
export async function seedTeamBeverageConsumption(
  firestore: Firestore,
  teamId: string,
  playerId: string,
  consumption: BeverageConsumption
): Promise<string> {
  await seedTeam(firestore, teamId);
  const consumptionRef = doc(
    firestore,
    `teams/${teamId}/players/${playerId}/beverageConsumptions`,
    consumption.id
  );
  const batch = writeBatch(firestore);
  batch.set(consumptionRef, consumption);
  await batch.commit();
  return consumption.id;
}

/**
 * Clear all data from a collection
 * @param firestore Firestore instance
 * @param collectionPath Collection path
 */
export async function clearCollection(firestore: Firestore, collectionPath: string): Promise<void> {
  const { getDocs, collection, writeBatch } = await import('firebase/firestore');
  const collectionRef = collection(firestore, collectionPath);
  const snapshot = await getDocs(collectionRef);

  if (snapshot.empty) return;

  // Known subcollections under user documents that need cleanup between tests
  const userSubcollections = ['fines', 'payments', 'duePayments', 'beverageConsumptions'];

  // Known subcollections under team player documents
  const teamPlayerSubcollections = ['fines', 'payments', 'beverageConsumptions', 'duePayments'];

  // Known subcollections directly under team documents
  const teamSubcollections = ['predefinedFines', 'teamMembers'];

  // Delete nested subcollections first (to avoid orphaned subcollection docs between tests)
  if (collectionPath === 'users') {
    for (const docSnap of snapshot.docs) {
      const userId = docSnap.id;
      for (const sub of userSubcollections) {
        const subColRef = collection(firestore, `users/${userId}/${sub}`);
        const subSnap = await getDocs(subColRef);
        if (!subSnap.empty) {
          const subBatch = writeBatch(firestore);
          subSnap.docs.forEach(subDoc => subBatch.delete(subDoc.ref));
          await subBatch.commit();
        }
      }
    }
  }

  if (collectionPath === 'teams') {
    for (const teamSnap of snapshot.docs) {
      const teamId = teamSnap.id;
      // players
      const playersColRef = collection(firestore, `teams/${teamId}/players`);
      const playersSnap = await getDocs(playersColRef);
      for (const playerSnap of playersSnap.docs) {
        const playerId = playerSnap.id;
        for (const sub of teamPlayerSubcollections) {
          const subColRef = collection(firestore, `teams/${teamId}/players/${playerId}/${sub}`);
          const subSnap = await getDocs(subColRef);
          if (!subSnap.empty) {
            const subBatch = writeBatch(firestore);
            subSnap.docs.forEach(subDoc => subBatch.delete(subDoc.ref));
            await subBatch.commit();
          }
        }
      }

      // delete players themselves
      if (!playersSnap.empty) {
        const playersBatch = writeBatch(firestore);
        playersSnap.docs.forEach(p => playersBatch.delete(p.ref));
        await playersBatch.commit();
      }

      // Clean up team-level subcollections (predefinedFines, teamMembers)
      for (const sub of teamSubcollections) {
        const subColRef = collection(firestore, `teams/${teamId}/${sub}`);
        const subSnap = await getDocs(subColRef);
        if (!subSnap.empty) {
          const subBatch = writeBatch(firestore);
          subSnap.docs.forEach(subDoc => subBatch.delete(subDoc.ref));
          await subBatch.commit();
        }
      }
    }
  }

  // Now delete the documents in the root collection
  const batch = writeBatch(firestore);
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

/**
 * Clear all test data from Firestore
 * @param firestore Firestore instance
 */
export async function clearAllTestData(firestore: Firestore): Promise<void> {
  await Promise.all([
    clearCollection(firestore, 'users'),
    clearCollection(firestore, 'teams'),
    clearCollection(firestore, 'dues'),
    clearCollection(firestore, 'beverages'),
  ]);
}
