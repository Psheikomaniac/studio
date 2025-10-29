#!/usr/bin/env tsx

/**
 * Script to debug beverage calculation discrepancy
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

interface PunishmentCSVRow {
  team_id: string;
  team_name: string;
  penatly_created: string;
  penatly_user: string;
  penatly_reason: string;
  penatly_archived: string;
  penatly_paid: string;
  penatly_amount: string;
  penatly_currency: string;
  penatly_subject: string;
  search_params: string;
}

interface TransactionCSVRow {
  team_id: string;
  team_name: string;
  transaction_date: string;
  transaction_amount: string;
  transaction_currency: string;
  transaction_subject: string;
  balance_total: string;
  balance_filtered: string;
  search_params: string;
}

// Helper function to convert amount from cents to euros
function centsToEuros(cents: string): number {
  return parseInt(cents || '0', 10) / 100;
}

// Helper function to parse CSV with semicolon delimiter
function parseCSV<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse(content, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
  });

  return result.data as T[];
}

function main() {
  const dataDir = path.join(process.cwd(), 'data');
  const targetUser = process.argv[2] || 'Heiko Rademacher';

  console.log('\n🔍 DEBUGGING BEVERAGE CALCULATION DISCREPANCY\n');
  console.log('='.repeat(80));
  console.log(`Analyzing: ${targetUser}\n`);

  // Parse CSV files
  const punishments = parseCSV<PunishmentCSVRow>(path.join(dataDir, 'cashbox-punishments-27-10-2025-132755.csv'));
  const transactions = parseCSV<TransactionCSVRow>(path.join(dataDir, 'cashbox-transactions-27-10-2025-132849.csv'));

  // 1. Find all beverage consumptions from punishments
  console.log('\n📋 STEP 1: BEVERAGE CONSUMPTIONS (from punishments CSV)\n');
  console.log('-'.repeat(80));

  const userBeverages = punishments.filter(p =>
    p.penatly_user === targetUser &&
    p.penatly_reason.toLowerCase().includes('getränke')
  );

  let totalFromPunishments = 0;
  let paidFromPunishments = 0;
  let unpaidFromPunishments = 0;

  console.log(`Found ${userBeverages.length} beverage entries in punishments CSV:\n`);

  const beveragesByStatus = {
    paid: [] as { date: string; amount: number }[],
    unpaid: [] as { date: string; amount: number }[],
  };

  userBeverages.forEach(b => {
    const amount = centsToEuros(b.penatly_amount);
    const isPaid = b.penatly_paid !== '';
    totalFromPunishments += amount;

    if (isPaid) {
      paidFromPunishments += amount;
      beveragesByStatus.paid.push({ date: b.penatly_created, amount });
    } else {
      unpaidFromPunishments += amount;
      beveragesByStatus.unpaid.push({ date: b.penatly_created, amount });
    }
  });

  console.log(`Paid Beverages (${beveragesByStatus.paid.length}):`);
  beveragesByStatus.paid.forEach(b => {
    console.log(`  ✓ ${b.date}: €${b.amount.toFixed(2)}`);
  });

  console.log(`\nUnpaid Beverages (${beveragesByStatus.unpaid.length}):`);
  beveragesByStatus.unpaid.forEach(b => {
    console.log(`  ✗ ${b.date}: €${b.amount.toFixed(2)}`);
  });

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total:   €${totalFromPunishments.toFixed(2)}`);
  console.log(`Paid:    €${paidFromPunishments.toFixed(2)}`);
  console.log(`Unpaid:  €${unpaidFromPunishments.toFixed(2)}`);

  // 2. Find all beverage-related transactions
  console.log('\n\n💰 STEP 2: BEVERAGE PAYMENTS (from transactions CSV)\n');
  console.log('-'.repeat(80));

  const beverageTransactions = transactions.filter(t =>
    t.transaction_subject.includes(targetUser) &&
    t.transaction_subject.toLowerCase().includes('getränke')
  );

  console.log(`Found ${beverageTransactions.length} beverage payment entries in transactions CSV:\n`);

  let totalBeveragePayments = 0;
  beverageTransactions.forEach(t => {
    const amount = centsToEuros(t.transaction_amount);
    totalBeveragePayments += amount;
    console.log(`  ✓ ${t.transaction_date}: ${t.transaction_subject} → €${amount.toFixed(2)}`);
  });

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total Beverage Payments: €${totalBeveragePayments.toFixed(2)}`);

  // 3. Check if transactions are being double-counted
  console.log('\n\n⚠️  STEP 3: CHECKING FOR DOUBLE-COUNTING\n');
  console.log('-'.repeat(80));

  console.log('\nQuestion: Are beverage payments in transactions also in punishments?');
  console.log('Answer: Let\'s check...\n');

  // Group beverage transactions by date and amount
  const transactionsByDate = new Map<string, number>();
  beverageTransactions.forEach(t => {
    const date = t.transaction_date;
    const amount = centsToEuros(t.transaction_amount);
    const count = transactionsByDate.get(date) || 0;
    transactionsByDate.set(date, count + amount);
  });

  console.log('Beverage payments grouped by date:');
  transactionsByDate.forEach((amount, date) => {
    console.log(`  ${date}: €${amount.toFixed(2)}`);
  });

  // 4. Analyze what the app might be doing wrong
  console.log('\n\n🔎 STEP 4: ANALYZING THE DISCREPANCY\n');
  console.log('='.repeat(80));

  console.log('\n📊 WHAT YOU SEE IN YOUR ANALYSIS:');
  console.log(`   Total:   €199.50`);
  console.log(`   Paid:    €184.50`);
  console.log(`   Unpaid:  €15.00`);

  console.log('\n📊 WHAT THE APP CALCULATION SHOWS:');
  console.log(`   Total:   €260.50`);
  console.log(`   Paid:    €245.50`);
  console.log(`   Unpaid:  €15.00`);

  console.log('\n📊 WHAT THE CSV DATA SHOWS (Punishments):');
  console.log(`   Total:   €${totalFromPunishments.toFixed(2)}`);
  console.log(`   Paid:    €${paidFromPunishments.toFixed(2)}`);
  console.log(`   Unpaid:  €${unpaidFromPunishments.toFixed(2)}`);

  const difference = 260.50 - totalFromPunishments;
  console.log(`\n💡 DIFFERENCE: €${difference.toFixed(2)}`);

  if (Math.abs(difference - totalBeveragePayments) < 0.01) {
    console.log('\n⚠️  PROBLEM IDENTIFIED!');
    console.log('─'.repeat(80));
    console.log('The app is counting beverage PAYMENTS from transactions as beverages!');
    console.log('');
    console.log('What\'s happening:');
    console.log('  1. Beverage consumptions from punishments:  €' + totalFromPunishments.toFixed(2));
    console.log('  2. Beverage payments from transactions:     €' + totalBeveragePayments.toFixed(2));
    console.log('  3. App incorrectly adds both:              €' + (totalFromPunishments + totalBeveragePayments).toFixed(2));
    console.log('');
    console.log('This is WRONG! Payments should NOT be added to consumptions.');
    console.log('Payments are already tracked separately as credits.');
  } else {
    console.log('\n🤔 The discrepancy might be due to a different reason.');
    console.log(`Beverage payments (€${totalBeveragePayments.toFixed(2)}) don't fully explain the difference.`);
  }

  // 5. Show correct calculation
  console.log('\n\n✅ STEP 5: CORRECT CALCULATION\n');
  console.log('='.repeat(80));

  console.log('\nThe correct beverage calculation should be:');
  console.log(`  Total Beverages Consumed:     €${totalFromPunishments.toFixed(2)}`);
  console.log(`  ├─ Paid:                      €${paidFromPunishments.toFixed(2)}`);
  console.log(`  └─ Unpaid (creates debit):    €${unpaidFromPunishments.toFixed(2)}`);
  console.log('');
  console.log('Note: Beverage PAYMENTS from transactions should be counted');
  console.log('      as general CREDITS, not added to beverage totals!');

  console.log('\n' + '='.repeat(80) + '\n');
}

main();
