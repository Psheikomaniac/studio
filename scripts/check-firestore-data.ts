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
import { getFirestore, collection, getDocs, collectionGroup, query, orderBy, limit } from 'firebase/firestore';

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
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('✅ Firebase initialized successfully');
    console.log(`📦 Project ID: ${firebaseConfig.projectId}\n`);

    // Check top-level collections
    console.log('📊 Checking top-level collections...\n');

    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`  Users (players):        ${usersSnap.size} documents`);

    const duesSnap = await getDocs(collection(db, 'dues'));
    console.log(`  Dues:                   ${duesSnap.size} documents`);

    const beveragesSnap = await getDocs(collection(db, 'beverages'));
    console.log(`  Beverages:              ${beveragesSnap.size} documents`);

    console.log('\n📊 Checking collection groups (transactions)...\n');

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

    // Test queries with orderBy (requires indexes)
    console.log('\n📊 Testing queries with orderBy (requires indexes)...\n');

    try {
      const finesQuery = query(collectionGroup(db, 'fines'), orderBy('date', 'desc'), limit(1));
      const finesTestSnap = await getDocs(finesQuery);
      console.log(`  Fines (orderBy date):   ✅ Works! (${finesTestSnap.size} results)`);
    } catch (error: any) {
      console.log(`  Fines (orderBy date):   ❌ FAILED - ${error.message}`);
      if (error.message.includes('index')) {
        console.log(`                          🔧 FIX: Deploy indexes with "firebase deploy --only firestore:indexes"`);
      }
    }

    try {
      const paymentsQuery = query(collectionGroup(db, 'payments'), orderBy('date', 'desc'), limit(1));
      const paymentsTestSnap = await getDocs(paymentsQuery);
      console.log(`  Payments (orderBy date): ✅ Works! (${paymentsTestSnap.size} results)`);
    } catch (error: any) {
      console.log(`  Payments (orderBy date): ❌ FAILED - ${error.message}`);
      if (error.message.includes('index')) {
        console.log(`                          🔧 FIX: Deploy indexes with "firebase deploy --only firestore:indexes"`);
      }
    }

    try {
      const duePaymentsQuery = query(collectionGroup(db, 'duePayments'), orderBy('createdAt', 'desc'), limit(1));
      const duePaymentsTestSnap = await getDocs(duePaymentsQuery);
      console.log(`  DuePayments (orderBy):  ✅ Works! (${duePaymentsTestSnap.size} results)`);
    } catch (error: any) {
      console.log(`  DuePayments (orderBy):  ❌ FAILED - ${error.message}`);
      if (error.message.includes('index')) {
        console.log(`                          🔧 FIX: Deploy indexes with "firebase deploy --only firestore:indexes"`);
      }
    }

    try {
      const consumptionsQuery = query(collectionGroup(db, 'beverageConsumptions'), orderBy('date', 'desc'), limit(1));
      const consumptionsTestSnap = await getDocs(consumptionsQuery);
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
    let totalTransactions = 0;
    let hasIndexErrors = false;

    try {
      const allFines = await getDocs(collectionGroup(db, 'fines'));
      const allPayments = await getDocs(collectionGroup(db, 'payments'));
      const allDuePayments = await getDocs(collectionGroup(db, 'duePayments'));
      const allConsumptions = await getDocs(collectionGroup(db, 'beverageConsumptions'));
      totalTransactions = allFines.size + allPayments.size + allDuePayments.size + allConsumptions.size;
    } catch (error: any) {
      if (error.message.includes('index')) {
        hasIndexErrors = true;
      }
    }

    if (totalUsers === 0) {
      console.log('❌ NO USERS FOUND');
      console.log('   → Import failed or not yet executed');
      console.log('   → Go to /settings and import CSV files');
    } else {
      console.log(`✅ ${totalUsers} users found`);
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
      console.log('   1. Go to http://localhost:3000/settings');
      console.log('   2. Upload CSV files (filename must contain "dues", "transaction", or "punishment")');
      console.log('   3. Click "Import Data"');
      console.log('   4. Check for success/error messages');
    }

    console.log('');

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
