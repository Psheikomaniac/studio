/**
 * Firestore Data Wiper
 *
 * Deletes ALL documents from:
 * - collection groups: fines, payments, duePayments, beverageConsumptions
 * - top-level collections: dues, beverages, users
 *
 * Usage:
 *   npx tsx scripts/delete-firestore-data.ts
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  collectionGroup,
  getDocs,
  query,
  limit,
  writeBatch,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDjhSxCRUhOsNZMiKxuZEAHwcLLIJU3Av4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'studio-9498911553-e6834.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-9498911553-e6834',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-9498911553-e6834.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '358916918755',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:358916918755:web:3107a844f24c72d9e464d6',
};

async function deleteCollectionGroupInBatches(db: ReturnType<typeof getFirestore>, groupName: string, batchSize = 450) {
  let deleted = 0;
  for (;;) {
    const snap = await getDocs(query(collectionGroup(db, groupName), limit(batchSize)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    // yield
    await new Promise((r) => setTimeout(r, 0));
  }
  return deleted;
}

async function deleteTopLevelCollectionInBatches(db: ReturnType<typeof getFirestore>, collectionName: string, batchSize = 450) {
  let deleted = 0;
  for (;;) {
    const snap = await getDocs(query(collection(db, collectionName), limit(batchSize)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    await new Promise((r) => setTimeout(r, 0));
  }
  return deleted;
}

async function main() {
  console.log('⚠️  Deleting ALL Firestore data for project:', firebaseConfig.projectId);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  let total = 0;

  // Delete collection groups first (subcollections anywhere)
  const fines = await deleteCollectionGroupInBatches(db, 'fines');
  console.log('  Deleted fines:', fines);
  total += fines;

  const payments = await deleteCollectionGroupInBatches(db, 'payments');
  console.log('  Deleted payments:', payments);
  total += payments;

  const duePayments = await deleteCollectionGroupInBatches(db, 'duePayments');
  console.log('  Deleted duePayments:', duePayments);
  total += duePayments;

  const consumptions = await deleteCollectionGroupInBatches(db, 'beverageConsumptions');
  console.log('  Deleted beverageConsumptions:', consumptions);
  total += consumptions;

  // Then delete top-level collections
  const dues = await deleteTopLevelCollectionInBatches(db, 'dues');
  console.log('  Deleted dues:', dues);
  total += dues;

  const beverages = await deleteTopLevelCollectionInBatches(db, 'beverages');
  console.log('  Deleted beverages:', beverages);
  total += beverages;

  const users = await deleteTopLevelCollectionInBatches(db, 'users');
  console.log('  Deleted users:', users);
  total += users;

  console.log('✅ Done. Total documents deleted:', total);
}

main().catch((err) => {
  console.error('❌ Delete failed:', err);
  process.exit(1);
});
