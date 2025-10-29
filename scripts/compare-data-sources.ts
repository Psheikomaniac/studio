#!/usr/bin/env tsx

/**
 * Script to compare different data sources and identify discrepancies
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

  console.log('\n🔍 COMPARING DATA SOURCES\n');
  console.log('='.repeat(80));
  console.log(`Analyzing: ${targetUser}\n`);

  const punishments = parseCSV<PunishmentCSVRow>(path.join(dataDir, 'cashbox-punishments-27-10-2025-132755.csv'));

  // Separate beverages from other fines
  const allUserPunishments = punishments.filter(p => p.penatly_user === targetUser);

  const beverages = allUserPunishments.filter(p =>
    p.penatly_reason.toLowerCase().includes('getränke') ||
    p.penatly_reason.toLowerCase().includes('beverage')
  );

  const fines = allUserPunishments.filter(p =>
    !p.penatly_reason.toLowerCase().includes('getränke') &&
    !p.penatly_reason.toLowerCase().includes('beverage')
  );

  console.log('📊 BREAKDOWN OF PUNISHMENTS\n');
  console.log('-'.repeat(80));
  console.log(`Total punishments for ${targetUser}: ${allUserPunishments.length}`);
  console.log(`  ├─ Beverages (Getränke): ${beverages.length}`);
  console.log(`  └─ Other Fines: ${fines.length}\n`);

  // Analyze beverages
  console.log('\n🍺 BEVERAGE ANALYSIS\n');
  console.log('-'.repeat(80));

  let totalBev = 0;
  let paidBev = 0;
  let unpaidBev = 0;

  beverages.forEach(b => {
    const amount = centsToEuros(b.penatly_amount);
    totalBev += amount;
    if (b.penatly_paid !== '') {
      paidBev += amount;
    } else {
      unpaidBev += amount;
    }
  });

  console.log(`CSV Data (Punishments):`);
  console.log(`  Total: €${totalBev.toFixed(2)} (${beverages.length} entries)`);
  console.log(`  Paid:  €${paidBev.toFixed(2)}`);
  console.log(`  Unpaid: €${unpaidBev.toFixed(2)}\n`);

  // Analyze fines
  console.log('\n🚨 FINES ANALYSIS\n');
  console.log('-'.repeat(80));

  let totalFines = 0;
  let paidFines = 0;
  let unpaidFines = 0;

  fines.forEach(f => {
    const amount = centsToEuros(f.penatly_amount);
    totalFines += amount;
    if (f.penatly_paid !== '') {
      paidFines += amount;
    } else {
      unpaidFines += amount;
    }
  });

  console.log(`CSV Data (Punishments):`);
  console.log(`  Total: €${totalFines.toFixed(2)} (${fines.length} entries)`);
  console.log(`  Paid:  €${paidFines.toFixed(2)}`);
  console.log(`  Unpaid: €${unpaidFines.toFixed(2)}\n`);

  // The issue the user reported
  console.log('\n⚠️  REPORTED DISCREPANCY\n');
  console.log('='.repeat(80));
  console.log('\n📊 User\'s Initial Analysis (from screenshot/analysis):');
  console.log('   Beverages:');
  console.log('     Total: €199.50');
  console.log('     Paid:  €184.50');
  console.log('     Unpaid: €15.00');
  console.log('\n📊 App Calculation (claimed):');
  console.log('   Beverages:');
  console.log('     Total: €260.50');
  console.log('     Paid:  €245.50');
  console.log('     Unpaid: €15.00');
  console.log('\n📊 CSV Data (actual):');
  console.log('   Beverages:');
  console.log(`     Total: €${totalBev.toFixed(2)}`);
  console.log(`     Paid:  €${paidBev.toFixed(2)}`);
  console.log(`     Unpaid: €${unpaidBev.toFixed(2)}`);

  // Calculate differences
  const diff1 = totalBev - 199.50;
  const diff2 = 260.50 - totalBev;
  const diff3 = totalBev - 184.50;

  console.log('\n💡 ANALYSIS:\n');
  console.log(`   CSV Total (${totalBev.toFixed(2)}) - User's Total (199.50) = €${diff1.toFixed(2)}`);
  console.log(`   App Calculation (260.50) - CSV Total (${totalBev.toFixed(2)}) = €${diff2.toFixed(2)}`);

  if (Math.abs(diff1 - 15) < 0.01) {
    console.log('\n   ✓ The €15 difference between CSV (214.50) and user\'s analysis (199.50)');
    console.log('     matches the UNPAID amount!');
    console.log('     → User might be looking at PAID beverages only (€199.50)');
  }

  if (Math.abs(diff2 - 46) < 0.01) {
    console.log('\n   ✗ The €46 difference between app calculation (260.50) and CSV (214.50)');
    console.log('     suggests the app is adding extra data from somewhere!');
    console.log('     → Possible causes:');
    console.log('       1. Firebase has more data than the CSV export');
    console.log('       2. App is double-counting beverage payments');
    console.log('       3. App is including beverage transactions as consumptions');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

main();
