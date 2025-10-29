#!/usr/bin/env tsx

/**
 * Script to analyze balance calculation and explain discrepancies
 * This script simulates how the app calculates balances
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

/**
 * This function simulates the app's balance calculation logic
 * Based on src/lib/utils.ts -> calculatePlayerBalance
 */
function calculateBalanceAsApp(
  userName: string,
  dues: DueCSVRow[],
  punishments: PunishmentCSVRow[],
  transactions: TransactionCSVRow[]
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 ANALYZING BALANCE FOR: ${userName}`);
  console.log(`${'='.repeat(80)}\n`);

  // 1. PAYMENTS (Credits) - from transactions
  const paymentTransactions = transactions.filter(t =>
    t.transaction_subject.includes(userName) &&
    !t.transaction_subject.toLowerCase().includes('strafen')
  );

  console.log(`\n💰 STEP 1: CALCULATE CREDITS (Payments)`);
  console.log('-'.repeat(80));

  let totalCredits = 0;
  const paymentsByType = {
    duePayments: [] as { subject: string; amount: number; date: string }[],
    otherPayments: [] as { subject: string; amount: number; date: string }[],
  };

  paymentTransactions.forEach(t => {
    const amount = centsToEuros(t.transaction_amount);
    totalCredits += amount;

    const paymentInfo = {
      subject: t.transaction_subject,
      amount,
      date: t.transaction_date
    };

    if (t.transaction_subject.toLowerCase().includes('beiträge')) {
      paymentsByType.duePayments.push(paymentInfo);
    } else {
      paymentsByType.otherPayments.push(paymentInfo);
    }
  });

  console.log(`\nDue Payments (${paymentsByType.duePayments.length}):`);
  paymentsByType.duePayments.forEach(p => {
    console.log(`  ✓ ${p.date}: ${p.subject} → +€${p.amount.toFixed(2)}`);
  });

  console.log(`\nOther Payments (${paymentsByType.otherPayments.length}):`);
  paymentsByType.otherPayments.forEach(p => {
    console.log(`  ✓ ${p.date}: ${p.subject} → +€${p.amount.toFixed(2)}`);
  });

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total Credits: +€${totalCredits.toFixed(2)}`);

  // 2. FINES (Debits) - from punishments
  console.log(`\n\n🚨 STEP 2: CALCULATE DEBITS FROM FINES`);
  console.log('-'.repeat(80));

  const userFines = punishments.filter(p =>
    p.penatly_user === userName &&
    !p.penatly_reason.toLowerCase().includes('getränke')
  );

  let totalFineDebits = 0;
  const finesByStatus = {
    paid: [] as { reason: string; amount: number; date: string }[],
    unpaid: [] as { reason: string; amount: number; date: string; remaining: number }[],
  };

  userFines.forEach(f => {
    const amount = centsToEuros(f.penatly_amount);
    const isPaid = f.penatly_paid !== '';

    const fineInfo = {
      reason: f.penatly_reason,
      amount,
      date: f.penatly_created
    };

    if (isPaid) {
      finesByStatus.paid.push(fineInfo);
    } else {
      // Unpaid fine = remaining debit
      totalFineDebits += amount;
      finesByStatus.unpaid.push({ ...fineInfo, remaining: amount });
    }
  });

  console.log(`\nPaid Fines (${finesByStatus.paid.length}) - NO DEBIT:`);
  finesByStatus.paid.slice(0, 5).forEach(f => {
    console.log(`  ✓ ${f.date}: ${f.reason} → €${f.amount.toFixed(2)} (paid)`);
  });
  if (finesByStatus.paid.length > 5) {
    console.log(`  ... and ${finesByStatus.paid.length - 5} more paid fines`);
  }

  console.log(`\nUnpaid Fines (${finesByStatus.unpaid.length}) - CREATES DEBIT:`);
  finesByStatus.unpaid.forEach(f => {
    console.log(`  ✗ ${f.date}: ${f.reason} → -€${f.remaining.toFixed(2)}`);
  });

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total Fine Debits: -€${totalFineDebits.toFixed(2)}`);

  // 3. DUES (Debits) - from dues
  console.log(`\n\n📝 STEP 3: CALCULATE DEBITS FROM DUES`);
  console.log('-'.repeat(80));

  const userDues = dues.filter(d => d.username === userName);

  let totalDueDebits = 0;
  const duesByStatus = {
    paid: [] as { name: string; amount: number; date: string; archived: string }[],
    exempt: [] as { name: string; amount: number; date: string; archived: string }[],
    unpaid: [] as { name: string; amount: number; date: string; remaining: number; archived: string }[],
  };

  userDues.forEach(d => {
    const amount = centsToEuros(d.due_amount);
    const status = d.user_paid;
    const archived = d.due_archived;

    const dueInfo = {
      name: d.due_name,
      amount,
      date: d.due_created,
      archived
    };

    if (status === 'STATUS_PAID') {
      duesByStatus.paid.push(dueInfo);
    } else if (status === 'STATUS_EXEMPT') {
      duesByStatus.exempt.push(dueInfo);
    } else {
      // Unpaid due = remaining debit
      totalDueDebits += amount;
      duesByStatus.unpaid.push({ ...dueInfo, remaining: amount });
    }
  });

  console.log(`\nPaid Dues (${duesByStatus.paid.length}) - NO DEBIT:`);
  duesByStatus.paid.forEach(d => {
    const archiveLabel = d.archived === 'YES' ? ' [ARCHIVED]' : ' [ACTIVE]';
    console.log(`  ✓ ${d.date}: ${d.name}${archiveLabel} → €${d.amount.toFixed(2)} (paid)`);
  });

  console.log(`\nExempt Dues (${duesByStatus.exempt.length}) - NO DEBIT:`);
  duesByStatus.exempt.forEach(d => {
    const archiveLabel = d.archived === 'YES' ? ' [ARCHIVED]' : ' [ACTIVE]';
    console.log(`  ⊘ ${d.date}: ${d.name}${archiveLabel} → €${d.amount.toFixed(2)} (exempt)`);
  });

  console.log(`\nUnpaid Dues (${duesByStatus.unpaid.length}) - CREATES DEBIT:`);
  duesByStatus.unpaid.forEach(d => {
    const archiveLabel = d.archived === 'YES' ? ' [ARCHIVED]' : ' [ACTIVE]';
    console.log(`  ✗ ${d.date}: ${d.name}${archiveLabel} → -€${d.remaining.toFixed(2)}`);
  });

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total Due Debits: -€${totalDueDebits.toFixed(2)}`);

  // 4. BEVERAGES (Debits) - from punishments
  console.log(`\n\n🍺 STEP 4: CALCULATE DEBITS FROM BEVERAGES`);
  console.log('-'.repeat(80));

  const userBeverages = punishments.filter(p =>
    p.penatly_user === userName &&
    p.penatly_reason.toLowerCase().includes('getränke')
  );

  let totalBeverageDebits = 0;
  const beveragesByStatus = {
    paid: [] as { reason: string; amount: number; date: string }[],
    unpaid: [] as { reason: string; amount: number; date: string; remaining: number }[],
  };

  userBeverages.forEach(b => {
    const amount = centsToEuros(b.penatly_amount);
    const isPaid = b.penatly_paid !== '';

    const bevInfo = {
      reason: b.penatly_reason,
      amount,
      date: b.penatly_created
    };

    if (isPaid) {
      beveragesByStatus.paid.push(bevInfo);
    } else {
      // Unpaid beverage = remaining debit
      totalBeverageDebits += amount;
      beveragesByStatus.unpaid.push({ ...bevInfo, remaining: amount });
    }
  });

  console.log(`\nPaid Beverages (${beveragesByStatus.paid.length}) - NO DEBIT:`);
  beveragesByStatus.paid.slice(0, 5).forEach(b => {
    console.log(`  ✓ ${b.date}: ${b.reason} → €${b.amount.toFixed(2)} (paid)`);
  });
  if (beveragesByStatus.paid.length > 5) {
    console.log(`  ... and ${beveragesByStatus.paid.length - 5} more paid beverages`);
  }

  console.log(`\nUnpaid Beverages (${beveragesByStatus.unpaid.length}) - CREATES DEBIT:`);
  beveragesByStatus.unpaid.forEach(b => {
    console.log(`  ✗ ${b.date}: ${b.reason} → -€${b.remaining.toFixed(2)}`);
  });

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`Total Beverage Debits: -€${totalBeverageDebits.toFixed(2)}`);

  // 5. FINAL BALANCE CALCULATION
  console.log(`\n\n💵 STEP 5: CALCULATE FINAL BALANCE`);
  console.log('='.repeat(80));

  const totalDebits = totalFineDebits + totalDueDebits + totalBeverageDebits;
  const balance = totalCredits - totalDebits;

  console.log(`\nBalance Formula (from src/lib/utils.ts):`);
  console.log(`  Balance = Credits - (Fine Debits + Due Debits + Beverage Debits)\n`);

  console.log(`Credits:                                 +€${totalCredits.toFixed(2)}`);
  console.log(`Debits:`);
  console.log(`  ├─ Fines (unpaid):                     -€${totalFineDebits.toFixed(2)}`);
  console.log(`  ├─ Dues (unpaid):                      -€${totalDueDebits.toFixed(2)}`);
  console.log(`  └─ Beverages (unpaid):                 -€${totalBeverageDebits.toFixed(2)}`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`FINAL BALANCE:                           ${balance >= 0 ? '+' : ''}€${balance.toFixed(2)}`);

  console.log(`\n${'='.repeat(80)}\n`);

  // Return summary
  return {
    userName,
    totalCredits,
    totalFineDebits,
    totalDueDebits,
    totalBeverageDebits,
    totalDebits,
    balance,
    duePaymentCount: paymentsByType.duePayments.length,
    duePaymentAmount: paymentsByType.duePayments.reduce((sum, p) => sum + p.amount, 0),
  };
}

function main() {
  const dataDir = path.join(process.cwd(), 'data');

  // Parse CSV files
  const dues = parseCSV<DueCSVRow>(path.join(dataDir, 'cashbox-dues-27-10-2025-132824.csv'));
  const punishments = parseCSV<PunishmentCSVRow>(path.join(dataDir, 'cashbox-punishments-27-10-2025-132755.csv'));
  const transactions = parseCSV<TransactionCSVRow>(path.join(dataDir, 'cashbox-transactions-27-10-2025-132849.csv'));

  console.log('\n🔍 BALANCE CALCULATION ANALYSIS\n');
  console.log('This script simulates how the app calculates player balances.');
  console.log('Based on: src/lib/utils.ts -> calculatePlayerBalance()\n');

  // Analyze balance
  const targetUser = process.argv[2] || 'Alex Claus';
  const summary = calculateBalanceAsApp(targetUser, dues, punishments, transactions);

  // Print key insights
  console.log(`\n\n🔑 KEY INSIGHTS\n`);
  console.log('='.repeat(80));

  console.log(`\n1. The app ONLY counts UNPAID items as debits`);
  console.log(`   - Paid fines, dues, and beverages do NOT affect the balance`);
  console.log(`   - Only unpaid amounts create a negative balance\n`);

  console.log(`2. Payments are counted as CREDITS`);
  console.log(`   - You have ${summary.duePaymentCount} due payment(s) totaling €${summary.duePaymentAmount.toFixed(2)}`);
  console.log(`   - These payments add to your credit balance\n`);

  console.log(`3. Your current balance breakdown:`);
  console.log(`   - Total you owe (unpaid):    -€${summary.totalDebits.toFixed(2)}`);
  console.log(`     ├─ Unpaid fines:           -€${summary.totalFineDebits.toFixed(2)}`);
  console.log(`     ├─ Unpaid dues:            -€${summary.totalDueDebits.toFixed(2)}`);
  console.log(`     └─ Unpaid beverages:       -€${summary.totalBeverageDebits.toFixed(2)}`);
  console.log(`   - Total you paid (credits):  +€${summary.totalCredits.toFixed(2)}`);
  console.log(`   - Net balance:               ${summary.balance >= 0 ? '+' : ''}€${summary.balance.toFixed(2)}\n`);

  console.log('='.repeat(80));
  console.log('\n✅ Analysis complete!\n');
}

main();
