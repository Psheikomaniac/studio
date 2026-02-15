/**
 * Firestore Data Checker
 *
 * This script checks if data exists in Firestore and diagnoses common issues.
 *
 * Usage:
 *   npx tsx scripts/check-firestore-data.ts
 *
 * Requirements:
 *   npm install tsx (if not installed)
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
  collectionGroup,
  query,
} from 'firebase/firestore';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

function parseHostPort(
  value: string | undefined,
  defaults: { host: string; port: number }
): { host: string; port: number } {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return defaults;

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const withoutProtocol = hasProtocol ? trimmed.replace(/^https?:\/\//i, '') : trimmed;
  const [hostPart, portPart] = withoutProtocol.split(':');
  const host = (hostPart ?? '').trim() || defaults.host;
  const port = portPart ? Number(portPart) : defaults.port;

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : defaults.port,
  };
}

// Import Firebase config from your environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDjhSxCRUhOsNZMiKxuZEAHwcLLIJU3Av4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'studio-9498911553-e6834.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-9498911553-e6834',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-9498911553-e6834.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '358916918755',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:358916918755:web:3107a844f24c72d9e464d6'
};

async function checkFirestoreData() {
  console.log('🔍 Firestore Data Checker');
  console.log('==========================\n');

  try {
    const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

    if (firestoreEmulatorHost) {
      // Emulator mode (recommended): use firebase-admin to bypass Firestore rules.
      const target = parseHostPort(firestoreEmulatorHost, { host: '127.0.0.1', port: 8080 });
      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        firebaseConfig.projectId ||
        'demo-project';

      if (!getAdminApps().length) {
        initializeAdminApp({ projectId });
      }
      const adminDb = getAdminFirestore();

      console.log(`✅ Using Firestore emulator at ${target.host}:${target.port}`);
      console.log('✅ Firebase initialized successfully (admin)');
      console.log(`📦 Project ID: ${projectId}\n`);

      // Check top-level collections
      console.log('📊 Checking top-level collections...\n');

      const usersSnap = await adminDb.collection('users').get();
      console.log(`  Users (players):        ${usersSnap.size} documents`);

      const clubsSnap = await adminDb.collection('clubs').get();
      console.log(`  Clubs:                  ${clubsSnap.size} documents`);

      const teamsSnap = await adminDb.collection('teams').get();
      console.log(`  Teams:                  ${teamsSnap.size} documents`);

      const teamInvitesSnap = await adminDb.collection('teamInvites').get();
      console.log(`  TeamInvites:            ${teamInvitesSnap.size} documents`);

      const duesSnap = await adminDb.collection('dues').get();
      console.log(`  Dues:                   ${duesSnap.size} documents`);

      const beveragesSnap = await adminDb.collection('beverages').get();
      console.log(`  Beverages:              ${beveragesSnap.size} documents`);

      console.log('\n📊 Checking collection groups (transactions + tenancy)...\n');

      const finesSnap = await adminDb.collectionGroup('fines').get();
      console.log(`  Fines:                  ${finesSnap.size} documents`);
      const paymentsSnap = await adminDb.collectionGroup('payments').get();
      console.log(`  Payments:               ${paymentsSnap.size} documents`);
      const duePaymentsSnap = await adminDb.collectionGroup('duePayments').get();
      console.log(`  DuePayments:            ${duePaymentsSnap.size} documents`);
      const consumptionsSnap = await adminDb.collectionGroup('beverageConsumptions').get();
      console.log(`  BeverageConsumptions:   ${consumptionsSnap.size} documents`);

      const playersSnap = await adminDb.collectionGroup('players').get();
      console.log(`  Players (team-scoped):  ${playersSnap.size} documents`);
      const teamMembersSnap = await adminDb.collectionGroup('teamMembers').get();
      console.log(`  TeamMembers:            ${teamMembersSnap.size} documents`);
      const clubMembersSnap = await adminDb.collectionGroup('clubMembers').get();
      console.log(`  ClubMembers:            ${clubMembersSnap.size} documents`);

      // Test queries with orderBy (requires indexes)
      console.log('\n📊 Testing queries with orderBy (requires indexes)...\n');

      try {
        const finesTestSnap = await adminDb.collectionGroup('fines').orderBy('date', 'desc').limit(1).get();
        console.log(`  Fines (orderBy date):   ✅ Works! (${finesTestSnap.size} results)`);
      } catch (error: any) {
        console.log(`  Fines (orderBy date):   ❌ FAILED - ${error.message}`);
        if (error.message.includes('index')) {
          console.log(`                          🔧 FIX: Deploy indexes with "firebase deploy --only firestore:indexes"`);
        }
      }

      try {
        const paymentsTestSnap = await adminDb.collectionGroup('payments').orderBy('date', 'desc').limit(1).get();
        console.log(`  Payments (orderBy date): ✅ Works! (${paymentsTestSnap.size} results)`);
      } catch (error: any) {
        console.log(`  Payments (orderBy date): ❌ FAILED - ${error.message}`);
        if (error.message.includes('index')) {
          console.log(`                          🔧 FIX: Deploy indexes with "firebase deploy --only firestore:indexes"`);
        }
      }

      try {
        const duePaymentsTestSnap = await adminDb.collectionGroup('duePayments').orderBy('createdAt', 'desc').limit(1).get();
        console.log(`  DuePayments (orderBy):  ✅ Works! (${duePaymentsTestSnap.size} results)`);
      } catch (error: any) {
        console.log(`  DuePayments (orderBy):  ❌ FAILED - ${error.message}`);
        if (error.message.includes('index')) {
          console.log(`                          🔧 FIX: Deploy indexes with "firebase deploy --only firestore:indexes"`);
        }
      }

      try {
        const consumptionsTestSnap = await adminDb.collectionGroup('beverageConsumptions').orderBy('date', 'desc').limit(1).get();
        console.log(`  BeverageConsumptions:   ✅ Works! (${consumptionsTestSnap.size} results)`);
      } catch (error: any) {
        console.log(`  BeverageConsumptions:   ❌ FAILED - ${error.message}`);
        if (error.message.includes('index')) {
          console.log(`                          🔧 FIX: Deploy indexes with "firebase deploy --only firestore:indexes"`);
        }
      }

      // Summary
      console.log('\n==========================');
      console.log('📋 Summary\n');

      const totalUsers = usersSnap.size;
      const totalTransactions = finesSnap.size + paymentsSnap.size + duePaymentsSnap.size + consumptionsSnap.size;
      const hasIndexErrors = false;

      if (totalUsers === 0) {
        console.log('ℹ️  NO LEGACY USERS FOUND (collection "users")');
        console.log('   → If you are using Team Tenancy, this can be expected (players live under teams/{teamId}/players).');
      } else {
        console.log(`✅ ${totalUsers} legacy users found`);
      }

      if (totalTransactions === 0 && !hasIndexErrors) {
        console.log('❌ NO TRANSACTIONS FOUND');
        console.log('   → Import failed or not yet executed');
        console.log('   → Check CSV import logs in Settings page');
      } else if (totalTransactions > 0) {
        console.log(`✅ ${totalTransactions} transactions found`);
      }

      if (hasIndexErrors) {
        console.log('\n⚠️  INDEX ERRORS DETECTED!');
        console.log('   → Collection Group queries require indexes');
        console.log('   → Run: firebase deploy --only firestore:indexes');
        console.log('   → Wait 1-2 minutes for indexes to build');
        console.log('   → Then reload the Money page');
      }

      console.log('\n==========================\n');

      if (totalUsers > 0 && totalTransactions > 0 && !hasIndexErrors) {
        console.log('✅ All checks passed! Data should appear in the Money page.');
        console.log('   If still not visible, check browser console with:');
        console.log('   NEXT_PUBLIC_FIREBASE_DEBUG_LOGS=true in .env.local');
      } else if (hasIndexErrors) {
        console.log('🔧 ACTION REQUIRED: Deploy Firestore indexes');
        console.log('   Run: firebase deploy --only firestore:indexes');
      } else if (totalUsers === 0 || totalTransactions === 0) {
        console.log('🔧 ACTION REQUIRED: Import CSV data');
        console.log('   1. Go to http://localhost:9002/settings');
        console.log('   2. Upload CSV files (filename must contain "dues", "transaction", or "punishment")');
        console.log('   3. Click "Import Data"');
        console.log('   4. Check for success/error messages');
      }

      console.log('');
      return;
    }

    // Production mode (no FIRESTORE_EMULATOR_HOST): uses client SDK and may be blocked by rules.
    console.log('⚠️  FIRESTORE_EMULATOR_HOST not set. This script will query the real Firebase project (subject to rules).');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase initialized successfully (client)');
    console.log(`📦 Project ID: ${firebaseConfig.projectId}\n`);

    // Best-effort: allow pointing the client SDK at an emulator via manual connect.
    // (Useful when you set NEXT_PUBLIC_* emulator vars but not FIRESTORE_EMULATOR_HOST.)
    const manualEmulator = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
    if (manualEmulator) {
      const target = parseHostPort(manualEmulator, { host: '127.0.0.1', port: 8080 });
      connectFirestoreEmulator(db, target.host, target.port);
      console.log(`✅ Connected client SDK to Firestore emulator at ${target.host}:${target.port}`);
    }

    // Check top-level collections
    console.log('📊 Checking top-level collections...\n');

    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`  Users (players):        ${usersSnap.size} documents`);

    const clubsSnap = await getDocs(collection(db, 'clubs'));
    console.log(`  Clubs:                  ${clubsSnap.size} documents`);

    const teamsSnap = await getDocs(collection(db, 'teams'));
    console.log(`  Teams:                  ${teamsSnap.size} documents`);

    const teamInvitesSnap = await getDocs(collection(db, 'teamInvites'));
    console.log(`  TeamInvites:            ${teamInvitesSnap.size} documents`);

    const duesSnap = await getDocs(collection(db, 'dues'));
    console.log(`  Dues:                   ${duesSnap.size} documents`);

    const beveragesSnap = await getDocs(collection(db, 'beverages'));
    console.log(`  Beverages:              ${beveragesSnap.size} documents`);

    console.log('\n📊 Checking collection groups (transactions + tenancy)...\n');

    // Check collection groups
    try {
      const finesSnap = await getDocs(query(collectionGroup(db, 'fines')));
      console.log(`  Fines:                  ${finesSnap.size} documents`);
    } catch (error: any) {
      console.log(`  Fines:                  ❌ ERROR - ${error.message}`);
      if (error.message.includes('index')) {
        console.log(`                          ⚠️  Missing index! Run: firebase deploy --only firestore:indexes`);
      }
    }

    try {
      const paymentsSnap = await getDocs(query(collectionGroup(db, 'payments')));
      console.log(`  Payments:               ${paymentsSnap.size} documents`);
    } catch (error: any) {
      console.log(`  Payments:               ❌ ERROR - ${error.message}`);
      if (error.message.includes('index')) {
        console.log(`                          ⚠️  Missing index! Run: firebase deploy --only firestore:indexes`);
      }
    }

    try {
      const duePaymentsSnap = await getDocs(query(collectionGroup(db, 'duePayments')));
      console.log(`  DuePayments:            ${duePaymentsSnap.size} documents`);
    } catch (error: any) {
      console.log(`  DuePayments:            ❌ ERROR - ${error.message}`);
      if (error.message.includes('index')) {
        console.log(`                          ⚠️  Missing index! Run: firebase deploy --only firestore:indexes`);
      }
    }

    try {
      const consumptionsSnap = await getDocs(query(collectionGroup(db, 'beverageConsumptions')));
      console.log(`  BeverageConsumptions:   ${consumptionsSnap.size} documents`);
    } catch (error: any) {
      console.log(`  BeverageConsumptions:   ❌ ERROR - ${error.message}`);
      if (error.message.includes('index')) {
        console.log(`                          ⚠️  Missing index! Run: firebase deploy --only firestore:indexes`);
      }
    }

    try {
      const playersSnap = await getDocs(query(collectionGroup(db, 'players')));
      console.log(`  Players (team-scoped):  ${playersSnap.size} documents`);
    } catch (error: any) {
      console.log(`  Players (team-scoped):  ❌ ERROR - ${error.message}`);
    }

    try {
      const teamMembersSnap = await getDocs(query(collectionGroup(db, 'teamMembers')));
      console.log(`  TeamMembers:            ${teamMembersSnap.size} documents`);
    } catch (error: any) {
      console.log(`  TeamMembers:            ❌ ERROR - ${error.message}`);
    }

    try {
      const clubMembersSnap = await getDocs(query(collectionGroup(db, 'clubMembers')));
      console.log(`  ClubMembers:            ${clubMembersSnap.size} documents`);
    } catch (error: any) {
      console.log(`  ClubMembers:            ❌ ERROR - ${error.message}`);
    }

    // Summary
    console.log('\n==========================');
    console.log('📋 Summary\n');

    const _totalUsers = usersSnap.size;
    let _totalTransactions = 0;
    let _hasIndexErrors = false;

    try {
      const allFines = await getDocs(collectionGroup(db, 'fines'));
      const allPayments = await getDocs(collectionGroup(db, 'payments'));
      const allDuePayments = await getDocs(collectionGroup(db, 'duePayments'));
      const allConsumptions = await getDocs(collectionGroup(db, 'beverageConsumptions'));
      _totalTransactions = allFines.size + allPayments.size + allDuePayments.size + allConsumptions.size;
    } catch (error: any) {
      if (error.message.includes('index')) {
        _hasIndexErrors = true;
      }
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check Firebase credentials in .env.local');
    console.log('   2. Ensure NEXT_PUBLIC_USE_FIREBASE=true');
    console.log('   3. Verify Firebase project is accessible');
    console.log('   4. Check network/firewall settings\n');
  }
}

// Run the checker
checkFirestoreData().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
