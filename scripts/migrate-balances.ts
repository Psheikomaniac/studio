
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';

// Import Firebase config from your environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDjhSxCRUhOsNZMiKxuZEAHwcLLIJU3Av4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'studio-9498911553-e6834.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-9498911553-e6834',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-9498911553-e6834.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '358916918755',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:358916918755:web:3107a844f24c72d9e464d6'
};

// Types (simplified from src/lib/types.ts)
interface Fine {
  id: string;
  userId: string;
  amount: number;
  paid: boolean;
  amountPaid?: number | null;
}

interface Payment {
  id: string;
  userId: string;
  amount: number;
  paid: boolean;
}

interface DuePayment {
  id: string;
  userId: string;
  amountDue: number;
  paid: boolean;
  amountPaid?: number | null;
  exempt: boolean;
}

interface BeverageConsumption {
  id: string;
  userId: string;
  amount: number;
  paid: boolean;
  amountPaid?: number | null;
}

function calculateBalance(
  payments: Payment[],
  fines: Fine[],
  duePayments: DuePayment[],
  beverageConsumptions: BeverageConsumption[]
): number {
  // Total credits from payments
  const totalCredits = payments
    .filter(p => p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  // Total debits from unpaid fines (or partially paid)
  const totalFineDebits = fines
    .reduce((sum, f) => {
      if (f.paid) return sum; // Fully paid, no debit
      const amountPaid = f.amountPaid || 0;
      const remaining = f.amount - amountPaid;
      return sum + remaining;
    }, 0);

  // Total debits from unpaid dues (or partially paid)
  const totalDueDebits = duePayments
    .filter(dp => !dp.exempt)
    .reduce((sum, dp) => {
      if (dp.paid) return sum; // Fully paid, no debit
      const amountPaid = dp.amountPaid || 0;
      const remaining = dp.amountDue - amountPaid;
      return sum + remaining;
    }, 0);

  // Total debits from unpaid beverages (or partially paid)
  const totalBeverageDebits = beverageConsumptions
    .reduce((sum, bc) => {
      if (bc.paid) return sum; // Fully paid, no debit
      const amountPaid = bc.amountPaid || 0;
      const remaining = bc.amount - amountPaid;
      return sum + remaining;
    }, 0);

  return totalCredits - totalFineDebits - totalDueDebits - totalBeverageDebits;
}

async function migrateBalances() {
  console.log('🔄 Starting Balance Migration...');
  console.log('================================');

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log(`✅ Firebase initialized (${firebaseConfig.projectId})`);

    // 1. Fetch all users
    console.log('fetching users...');
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnap.size} users.`);

    let updatedCount = 0;
    const batchSize = 500; // Firestore batch limit
    let batch = writeBatch(db);
    let operationCounter = 0;

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // 2. Fetch subcollections for each user
      const finesSnap = await getDocs(collection(db, `users/${userId}/fines`));
      const paymentsSnap = await getDocs(collection(db, `users/${userId}/payments`));
      const duePaymentsSnap = await getDocs(collection(db, `users/${userId}/duePayments`));
      const beveragesSnap = await getDocs(collection(db, `users/${userId}/beverageConsumptions`));

      const fines = finesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Fine));
      const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
      const duePayments = duePaymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as DuePayment));
      const beverages = beveragesSnap.docs.map(d => ({ id: d.id, ...d.data() } as BeverageConsumption));

      // 3. Calculate Balance
      const newBalance = calculateBalance(payments, fines, duePayments, beverages);
      
      // Log difference if any (optional)
      const oldBalance = userData.balance;
      if (oldBalance !== newBalance) {
          console.log(`User ${userData.name || userId}: Balance mismatch! Old: ${oldBalance}, New: ${newBalance}. Updating...`);
      } else {
          // console.log(`User ${userData.name || userId}: Balance correct (${newBalance}).`);
      }

      // 4. Update User
      batch.update(doc(db, 'users', userId), { balance: newBalance });
      operationCounter++;
      updatedCount++;

      if (operationCounter >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        operationCounter = 0;
        console.log(`Committed batch of ${batchSize} updates.`);
      }
    }

    if (operationCounter > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${operationCounter} updates.`);
    }

    console.log(`\n✅ Migration Complete. Updated ${updatedCount} users.`);

  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

migrateBalances();
