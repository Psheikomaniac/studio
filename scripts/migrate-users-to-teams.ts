/**
 * Migration Script: Move data from users/{userId}/... to teams/{teamId}/players/{playerId}/...
 *
 * This one-time migration script moves fines, payments, and beverageConsumptions
 * from the legacy `users/{userId}/...` paths to the unified
 * `teams/{teamId}/players/{playerId}/...` paths.
 *
 * Usage:
 *   npx ts-node scripts/migrate-users-to-teams.ts --teamId <teamId> [--dry-run]
 *
 * Options:
 *   --teamId <id>   The team ID to migrate data into (required)
 *   --dry-run       Show what would be migrated without writing (default: true)
 *   --execute       Actually perform the migration
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';

const SUBCOLLECTIONS = ['fines', 'payments', 'beverageConsumptions', 'duePayments'] as const;
const BATCH_SIZE = 500;

async function migrate() {
  const args = process.argv.slice(2);
  const teamIdIndex = args.indexOf('--teamId');
  const teamId = teamIdIndex >= 0 ? args[teamIdIndex + 1] : null;
  const dryRun = !args.includes('--execute');

  if (!teamId) {
    console.error('Usage: npx ts-node scripts/migrate-users-to-teams.ts --teamId <teamId> [--dry-run | --execute]');
    process.exit(1);
  }

  console.log(`\n=== Migration: users/ → teams/${teamId}/players/ ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'EXECUTE (writing data)'}\n`);

  // Initialize Firebase (uses environment config)
  const app = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
  });
  const firestore = getFirestore(app);

  // Get all users
  const usersSnapshot = await getDocs(collection(firestore, 'users'));
  console.log(`Found ${usersSnapshot.size} users to migrate\n`);

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    console.log(`--- Player: ${userData.name || userId} (${userId}) ---`);

    // Migrate player document
    if (!dryRun) {
      const batch = writeBatch(firestore);
      const playerRef = doc(firestore, `teams/${teamId}/players`, userId);
      batch.set(playerRef, { ...userData, teamId });
      await batch.commit();
    }
    console.log(`  Player document: ${dryRun ? 'WOULD migrate' : 'migrated'}`);
    totalMigrated++;

    // Migrate subcollections
    for (const sub of SUBCOLLECTIONS) {
      const subColRef = collection(firestore, `users/${userId}/${sub}`);
      const subSnapshot = await getDocs(subColRef);

      if (subSnapshot.empty) continue;

      console.log(`  ${sub}: ${subSnapshot.size} documents ${dryRun ? 'WOULD migrate' : 'to migrate'}`);

      if (!dryRun) {
        // Write in batches
        const docs = subSnapshot.docs;
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
          const batch = writeBatch(firestore);
          const batchDocs = docs.slice(i, i + BATCH_SIZE);

          for (const subDoc of batchDocs) {
            const newRef = doc(
              firestore,
              `teams/${teamId}/players/${userId}/${sub}`,
              subDoc.id
            );
            batch.set(newRef, { ...subDoc.data(), teamId });
          }

          await batch.commit();
        }
      }

      totalMigrated += subSnapshot.size;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total documents ${dryRun ? 'to migrate' : 'migrated'}: ${totalMigrated}`);
  console.log(`Skipped: ${totalSkipped}`);

  if (dryRun) {
    console.log(`\nThis was a DRY RUN. To execute, add --execute flag.`);
  } else {
    console.log(`\nMigration complete. Old data in users/ is preserved.`);
    console.log(`After verifying, you can manually delete the users/ collection.`);
  }
}

migrate().catch(console.error);
