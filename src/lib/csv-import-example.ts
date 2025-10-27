/**
 * Example usage of CSV import functions
 *
 * This file demonstrates how to use the csv-import module to import
 * data from the three CSV types: dues, punishments, and transactions.
 */

import { importCSV, importDuesCSV, importPunishmentsCSV, importTransactionsCSV } from './csv-import';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example 1: Import Dues CSV
 */
async function exampleImportDues() {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'cashbox-dues-27-10-2025-132824.csv');
    const csvText = fs.readFileSync(csvPath, 'utf-8');

    console.log('Importing Dues CSV...');
    const result = await importDuesCSV(csvText);

    console.log('Import Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Rows Processed: ${result.rowsProcessed}`);
    console.log(`- Players Created: ${result.playersCreated}`);
    console.log(`- Records Created: ${result.recordsCreated}`);
    console.log(`- Errors: ${result.errors.length}`);
    console.log(`- Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings (first 5):');
      result.warnings.slice(0, 5).forEach(warn => console.log(`  - ${warn}`));
    }
  } catch (error) {
    console.error('Error importing dues:', error);
  }
}

/**
 * Example 2: Import Punishments CSV
 */
async function exampleImportPunishments() {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'cashbox-punishments-27-10-2025-132755.csv');
    const csvText = fs.readFileSync(csvPath, 'utf-8');

    console.log('Importing Punishments CSV...');
    const result = await importPunishmentsCSV(csvText);

    console.log('Import Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Rows Processed: ${result.rowsProcessed}`);
    console.log(`- Players Created: ${result.playersCreated}`);
    console.log(`- Records Created: ${result.recordsCreated}`);
    console.log(`- Errors: ${result.errors.length}`);
    console.log(`- Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('\nErrors (first 5):');
      result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings (first 5):');
      result.warnings.slice(0, 5).forEach(warn => console.log(`  - ${warn}`));
    }
  } catch (error) {
    console.error('Error importing punishments:', error);
  }
}

/**
 * Example 3: Import Transactions CSV
 */
async function exampleImportTransactions() {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'cashbox-transactions-27-10-2025-132849.csv');
    const csvText = fs.readFileSync(csvPath, 'utf-8');

    console.log('Importing Transactions CSV...');
    const result = await importTransactionsCSV(csvText);

    console.log('Import Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Rows Processed: ${result.rowsProcessed}`);
    console.log(`- Players Created: ${result.playersCreated}`);
    console.log(`- Records Created: ${result.recordsCreated}`);
    console.log(`- Errors: ${result.errors.length}`);
    console.log(`- Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('\nErrors (first 5):');
      result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings (first 5):');
      result.warnings.slice(0, 5).forEach(warn => console.log(`  - ${warn}`));
    }
  } catch (error) {
    console.error('Error importing transactions:', error);
  }
}

/**
 * Example 4: Using the generic importCSV function
 */
async function exampleImportGeneric() {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'cashbox-dues-27-10-2025-132824.csv');
    const csvText = fs.readFileSync(csvPath, 'utf-8');

    console.log('Importing CSV using generic function...');
    const result = await importCSV(csvText, 'dues');

    console.log('Import Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Rows Processed: ${result.rowsProcessed}`);
    console.log(`- Records Created: ${result.recordsCreated}`);
  } catch (error) {
    console.error('Error importing CSV:', error);
  }
}

// Run examples
async function main() {
  console.log('=== CSV Import Examples ===\n');

  // Uncomment the example you want to run:
  // await exampleImportDues();
  // await exampleImportPunishments();
  // await exampleImportTransactions();
  // await exampleImportGeneric();

  console.log('\nDone!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
