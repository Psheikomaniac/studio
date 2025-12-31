/**
 * Emulator Data Wiper
 *
 * Deletes ALL documents from Firestore (current + legacy schema) and optionally deletes
 * all users from the Firebase Auth emulator.
 *
 * Firestore deletion:
 * - collection groups: fines, payments, duePayments, beverageConsumptions, players, teamMembers, clubMembers
 * - top-level collections: teams, teamInvites, clubs, users, dues, beverages
 *
 * Auth deletion:
 * - deletes all users in the Auth emulator (when FIREBASE_AUTH_EMULATOR_HOST is set)
 *
 * Safety:
 * - By default, this script refuses to run unless at least one emulator host is set:
 *   - FIRESTORE_EMULATOR_HOST for Firestore
 *   - FIREBASE_AUTH_EMULATOR_HOST for Auth
 * - If you really want to run against a non-emulator backend, you must explicitly opt-in:
 *   - ALLOW_NON_EMULATOR_WIPE=true (Firestore)
 *   - ALLOW_NON_EMULATOR_AUTH_WIPE=true (Auth)
 *
 * Usage:
 *   firebase emulators:exec --only firestore,auth "npm run wipe:db"
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { pathToFileURL } from 'node:url';

type AuthLike = {
  listUsers: (maxResults?: number, pageToken?: string) => Promise<{
    users: Array<{ uid: string }>;
    pageToken?: string;
  }>;
  deleteUser: (uid: string) => Promise<void>;
};

async function deleteCollectionGroupInBatches(db: Firestore, groupName: string, batchSize = 450) {
  let deleted = 0;
  for (;;) {
    const snap = await db.collectionGroup(groupName).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    // yield
    await new Promise((r) => setTimeout(r, 0));
  }
  return deleted;
}

async function deleteTopLevelCollectionInBatches(db: Firestore, collectionName: string, batchSize = 450) {
  let deleted = 0;
  for (;;) {
    const snap = await db.collection(collectionName).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    await new Promise((r) => setTimeout(r, 0));
  }
  return deleted;
}

export async function deleteAuthUsersInBatches(auth: AuthLike, batchSize = 1000) {
  let deleted = 0;
  let pageToken: string | undefined = undefined;

  for (;;) {
    const res = await auth.listUsers(batchSize, pageToken);
    const uids = (res.users ?? []).map((u) => u.uid).filter(Boolean);

    for (let i = 0; i < uids.length; i += 25) {
      const chunk = uids.slice(i, i + 25);
      await Promise.all(chunk.map((uid) => auth.deleteUser(uid)));
    }

    deleted += uids.length;
    pageToken = res.pageToken;

    if (!pageToken) break;
  }

  return deleted;
}

export async function main() {
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const allowNonEmulatorFirestore = process.env.ALLOW_NON_EMULATOR_WIPE === 'true';
  const allowNonEmulatorAuth = process.env.ALLOW_NON_EMULATOR_AUTH_WIPE === 'true';

  const canWipeFirestore = Boolean(firestoreEmulatorHost || allowNonEmulatorFirestore);
  const canWipeAuth = Boolean(authEmulatorHost || allowNonEmulatorAuth);

  if (!canWipeFirestore && !canWipeAuth) {
    throw new Error(
      'Refusing to wipe without emulator.\n' +
        'Set FIRESTORE_EMULATOR_HOST and/or FIREBASE_AUTH_EMULATOR_HOST, or explicitly opt-in via ALLOW_NON_EMULATOR_WIPE=true / ALLOW_NON_EMULATOR_AUTH_WIPE=true.'
    );
  }

  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'demo-project';

  console.log('⚠️  Deleting emulator data for project:', projectId);
  initializeApp({ projectId });
  const db = getFirestore();
  const auth = getAuth();

  let firestoreTotal = 0;
  let authTotal = 0;

  if (canWipeFirestore) {
    if (firestoreEmulatorHost) {
      console.log(`✅ Using Firestore emulator at ${firestoreEmulatorHost}`);
    } else {
      console.warn('⚠️  Wiping a non-emulator Firestore instance (ALLOW_NON_EMULATOR_WIPE=true).');
    }

    // Delete collection groups first (subcollections anywhere)
    // NOTE: Parent docs (e.g. teams/{teamId}) are not deleted by deleting subcollections.
    // We wipe top-level collections after collection groups.
    const collectionGroups = [
      'fines',
      'payments',
      'duePayments',
      'beverageConsumptions',
      'players',
      'teamMembers',
      'clubMembers',
    ];

    for (const groupName of collectionGroups) {
      const deleted = await deleteCollectionGroupInBatches(db, groupName);
      console.log(`  Deleted collectionGroup ${groupName}:`, deleted);
      firestoreTotal += deleted;
    }

    // Then delete top-level collections
    const topLevelCollections = [
      'teams',
      'teamInvites',
      'clubs',
      // legacy / partially migrated
      'users',
      'dues',
      'beverages',
    ];

    for (const colName of topLevelCollections) {
      const deleted = await deleteTopLevelCollectionInBatches(db, colName);
      console.log(`  Deleted collection ${colName}:`, deleted);
      firestoreTotal += deleted;
    }
  } else {
    console.log('ℹ️  Skipping Firestore wipe (no FIRESTORE_EMULATOR_HOST).');
  }

  if (canWipeAuth) {
    if (authEmulatorHost) {
      console.log(`✅ Using Auth emulator at ${authEmulatorHost}`);
    } else {
      console.warn('⚠️  Wiping a non-emulator Auth instance (ALLOW_NON_EMULATOR_AUTH_WIPE=true).');
    }

    authTotal = await deleteAuthUsersInBatches(auth);
    console.log('  Deleted Auth users:', authTotal);
  } else {
    console.log('ℹ️  Skipping Auth wipe (no FIREBASE_AUTH_EMULATOR_HOST).');
  }

  console.log('✅ Done. Deleted documents (Firestore):', firestoreTotal, 'Deleted users (Auth):', authTotal);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('❌ Delete failed:', err);
    process.exit(1);
  });
}
