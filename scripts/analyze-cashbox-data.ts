#!/usr/bin/env tsx

/**
 * Script to analyze cashbox CSV data and compare with code calculations
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

interface DueCSVRow {
  team_id: string;
  team_name: string;
  due_name: string;
  due_created: string;
  due_amount: string;
  due_currency: string;
  due_archived: string;
  user_id: string;
  username: string;
  user_paid: string;
  user_payment_date: string;
  search_params: string;
}

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

  console.log('🔍 Analyzing Cashbox Data\n');
  console.log('='.repeat(80));

  // Parse CSV files
  const dues = parseCSV<DueCSVRow>(path.join(dataDir, 'cashbox-dues-27-10-2025-132824.csv'));
  const punishments = parseCSV<PunishmentCSVRow>(path.join(dataDir, 'cashbox-punishments-27-10-2025-132755.csv'));
  const transactions = parseCSV<TransactionCSVRow>(path.join(dataDir, 'cashbox-transactions-27-10-2025-132849.csv'));

  console.log(`\n📊 Loaded Data:`);
  console.log(`   Dues: ${dues.length} entries`);
  console.log(`   Punishments: ${punishments.length} entries`);
  console.log(`   Transactions: ${transactions.length} entries`);

  // Get all unique users
  const usernames = new Set<string>();
  dues.forEach(d => usernames.add(d.username));
  punishments.forEach(p => usernames.add(p.penatly_user));

  // Ask user which player to analyze (default to first one for now)
  const targetUser = process.argv[2] || Array.from(usernames)[0];

  console.log(`\n👤 Analyzing user: ${targetUser}`);
  console.log('='.repeat(80));

  // Filter data for this user
  const userDues = dues.filter(d => d.username === targetUser);
  const userPunishments = punishments.filter(p => p.penatly_user === targetUser);

  // Separate punishments by type (Fines vs Beverages)
  const fines = userPunishments.filter(p =>
    !p.penatly_reason.toLowerCase().includes('getränke') &&
    !p.penatly_reason.toLowerCase().includes('beverage')
  );
  const beverages = userPunishments.filter(p =>
    p.penatly_reason.toLowerCase().includes('getränke') ||
    p.penatly_reason.toLowerCase().includes('beverage')
  );

  // Find payments for this user in transactions
  const userPayments = transactions.filter(t =>
    t.transaction_subject.includes(targetUser) &&
    !t.transaction_subject.toLowerCase().includes('strafen') &&
    !t.transaction_subject.toLowerCase().includes('beitrag') &&
    !t.transaction_subject.toLowerCase().includes('getränke')
  );

  console.log('\n\n📋 TRANSACTIONS BREAKDOWN\n');

  // 1. DUES
  console.log('1️⃣  DUES (Mitgliedsbeiträge)');
  console.log('-'.repeat(80));

  const duesGrouped = new Map<string, DueCSVRow[]>();
  userDues.forEach(due => {
    const key = `${due.due_name} (${due.due_created})`;
    if (!duesGrouped.has(key)) {
      duesGrouped.set(key, []);
    }
    duesGrouped.get(key)!.push(due);
  });

  let totalDues = 0;
  let paidDues = 0;
  let unpaidDues = 0;
  let exemptDues = 0;

  const archivedDues: DueCSVRow[] = [];
  const activeDues: DueCSVRow[] = [];

  userDues.forEach(due => {
    const amount = centsToEuros(due.due_amount);
    totalDues += amount;

    if (due.user_paid === 'STATUS_PAID') {
      paidDues += amount;
    } else if (due.user_paid === 'STATUS_EXEMPT') {
      exemptDues += amount;
    } else {
      unpaidDues += amount;
    }

    if (due.due_archived === 'YES') {
      archivedDues.push(due);
    } else {
      activeDues.push(due);
    }
  });

  console.log(`   Total Dues: €${totalDues.toFixed(2)}`);
  console.log(`   ├─ Paid: €${paidDues.toFixed(2)}`);
  console.log(`   ├─ Exempt: €${exemptDues.toFixed(2)}`);
  console.log(`   └─ Unpaid: €${unpaidDues.toFixed(2)}`);

  console.log(`\n   Archived Dues (${archivedDues.length}):`);
  archivedDues.forEach(due => {
    const amount = centsToEuros(due.due_amount);
    const status = due.user_paid === 'STATUS_PAID' ? '✓' :
                   due.user_paid === 'STATUS_EXEMPT' ? '⊘' : '✗';
    console.log(`   ${status} ${due.due_name} (${due.due_created}): €${amount.toFixed(2)}`);
  });

  console.log(`\n   Active Dues (${activeDues.length}):`);
  activeDues.forEach(due => {
    const amount = centsToEuros(due.due_amount);
    const status = due.user_paid === 'STATUS_PAID' ? '✓' :
                   due.user_paid === 'STATUS_EXEMPT' ? '⊘' : '✗';
    console.log(`   ${status} ${due.due_name} (${due.due_created}): €${amount.toFixed(2)}`);
  });

  // 2. FINES
  console.log('\n\n2️⃣  FINES (Strafen)');
  console.log('-'.repeat(80));

  let totalFines = 0;
  let paidFines = 0;
  let unpaidFines = 0;

  fines.forEach(fine => {
    const amount = centsToEuros(fine.penatly_amount);
    totalFines += amount;

    if (fine.penatly_paid) {
      paidFines += amount;
    } else {
      unpaidFines += amount;
    }
  });

  console.log(`   Total Fines: €${totalFines.toFixed(2)}`);
  console.log(`   ├─ Paid: €${paidFines.toFixed(2)}`);
  console.log(`   └─ Unpaid: €${unpaidFines.toFixed(2)}`);

  if (fines.length > 0) {
    console.log(`\n   Details (${fines.length} fines):`);
    fines.slice(0, 10).forEach(fine => {
      const amount = centsToEuros(fine.penatly_amount);
      const status = fine.penatly_paid ? '✓' : '✗';
      console.log(`   ${status} ${fine.penatly_created}: ${fine.penatly_reason} - €${amount.toFixed(2)}`);
    });
    if (fines.length > 10) {
      console.log(`   ... and ${fines.length - 10} more`);
    }
  }

  // 3. BEVERAGES
  console.log('\n\n3️⃣  BEVERAGES (Getränke)');
  console.log('-'.repeat(80));

  let totalBeverages = 0;
  let paidBeverages = 0;
  let unpaidBeverages = 0;

  beverages.forEach(bev => {
    const amount = centsToEuros(bev.penatly_amount);
    totalBeverages += amount;

    if (bev.penatly_paid) {
      paidBeverages += amount;
    } else {
      unpaidBeverages += amount;
    }
  });

  console.log(`   Total Beverages: €${totalBeverages.toFixed(2)}`);
  console.log(`   ├─ Paid: €${paidBeverages.toFixed(2)}`);
  console.log(`   └─ Unpaid: €${unpaidBeverages.toFixed(2)}`);

  if (beverages.length > 0) {
    console.log(`\n   Details (${beverages.length} beverages):`);
    beverages.slice(0, 10).forEach(bev => {
      const amount = centsToEuros(bev.penatly_amount);
      const status = bev.penatly_paid ? '✓' : '✗';
      console.log(`   ${status} ${bev.penatly_created}: ${bev.penatly_reason} - €${amount.toFixed(2)}`);
    });
    if (beverages.length > 10) {
      console.log(`   ... and ${beverages.length - 10} more`);
    }
  }

  // 4. PAYMENTS
  console.log('\n\n4️⃣  PAYMENTS (Gutschriften)');
  console.log('-'.repeat(80));

  let totalPayments = 0;

  userPayments.forEach(payment => {
    const amount = centsToEuros(payment.transaction_amount);
    totalPayments += amount;
  });

  console.log(`   Total Payments: €${totalPayments.toFixed(2)}`);

  if (userPayments.length > 0) {
    console.log(`\n   Details (${userPayments.length} payments):`);
    userPayments.slice(0, 10).forEach(payment => {
      const amount = centsToEuros(payment.transaction_amount);
      console.log(`   ✓ ${payment.transaction_date}: ${payment.transaction_subject} - €${amount.toFixed(2)}`);
    });
    if (userPayments.length > 10) {
      console.log(`   ... and ${userPayments.length - 10} more`);
    }
  }

  // BALANCE CALCULATION (based on code logic)
  console.log('\n\n💰 BALANCE CALCULATION (Code Logic)\n');
  console.log('='.repeat(80));

  const totalCredits = totalPayments;
  const totalDebits = unpaidFines + unpaidDues + unpaidBeverages;
  const balance = totalCredits - totalDebits;

  console.log(`Total Credits (Payments):              +€${totalCredits.toFixed(2)}`);
  console.log(`Total Debits (Unpaid):`);
  console.log(`  ├─ Unpaid Fines:                     -€${unpaidFines.toFixed(2)}`);
  console.log(`  ├─ Unpaid Dues:                      -€${unpaidDues.toFixed(2)}`);
  console.log(`  └─ Unpaid Beverages:                 -€${unpaidBeverages.toFixed(2)}`);
  console.log(`                                        ${'='.repeat(20)}`);
  console.log(`BALANCE:                               ${balance >= 0 ? '+' : ''}€${balance.toFixed(2)}`);

  // SUMMARY
  console.log('\n\n📊 SUMMARY\n');
  console.log('='.repeat(80));
  console.log(`Total Debits (All):                    €${(totalDues + totalFines + totalBeverages).toFixed(2)}`);
  console.log(`  ├─ Dues:                             €${totalDues.toFixed(2)}`);
  console.log(`  ├─ Fines:                            €${totalFines.toFixed(2)}`);
  console.log(`  └─ Beverages:                        €${totalBeverages.toFixed(2)}`);
  console.log(`\nTotal Credits (Payments):              €${totalPayments.toFixed(2)}`);
  console.log(`\nBalance Breakdown:`);
  console.log(`  Owed (Unpaid):                       -€${totalDebits.toFixed(2)}`);
  console.log(`  Paid (Credits):                      +€${totalCredits.toFixed(2)}`);
  console.log(`                                        ${'='.repeat(20)}`);
  console.log(`  Net Balance:                         ${balance >= 0 ? '+' : ''}€${balance.toFixed(2)}`);

  console.log('\n' + '='.repeat(80) + '\n');
}

main();
