/**
 * Integration Tests: CSV Import Workflows
 * Tests end-to-end CSV processing with Firestore persistence
 * All data is written to teams/{teamId}/players/{playerId}/... paths
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestFirestore } from './setup';
import {
  importDuesCSVToFirestore,
  importPunishmentsCSVToFirestore,
  importTransactionsCSVToFirestore,
} from '@/lib/csv-import-firestore';
import { clearCollection } from './helpers/seed-data';
import { getDocs, collection } from 'firebase/firestore';

const TEAM_ID = 'test-team-csv';

describe('Integration: CSV Import Workflows', () => {
  let firestore: ReturnType<typeof getTestFirestore>;

  beforeEach(async () => {
    firestore = getTestFirestore();

    // Clean up all collections
    await clearCollection(firestore, 'teams');
    await clearCollection(firestore, 'dues');
    await clearCollection(firestore, 'beverages');
  });

  describe('Dues CSV Import', () => {
    it('should import dues CSV with player creation (Given-When-Then)', async () => {
      // Given: Valid dues CSV data
      const csvContent = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Saison2425;5000;01-09-2024;NO;Alice Johnson;;STATUS_UNPAID;
Saison2425;5000;01-09-2024;NO;Bob Smith;;STATUS_PAID;15-10-2024
Meistershi;3000;15-11-2024;NO;Alice Johnson;;STATUS_UNPAID;`;

      // When: Importing the CSV
      const result = await importDuesCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Import should succeed
      expect(result.success).toBe(true);
      expect(result.rowsProcessed).toBe(3);
      expect(result.playersCreated).toBe(2); // Alice and Bob
      expect(result.recordsCreated).toBe(3);
      expect(result.errors).toHaveLength(0);

      // Verify players were created under team
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      expect(playersSnapshot.size).toBe(2);

      // Verify dues were created
      const duesSnapshot = await getDocs(collection(firestore, 'dues'));
      expect(duesSnapshot.size).toBe(2); // Saison2425 and Meistershi

      // Verify due payments were created under team players
      const duePaymentsPromises = playersSnapshot.docs.map(async (playerDoc) => {
        const duePaymentsSnapshot = await getDocs(
          collection(firestore, `teams/${TEAM_ID}/players/${playerDoc.id}/duePayments`)
        );
        return duePaymentsSnapshot.size;
      });
      const duePaymentsCounts = await Promise.all(duePaymentsPromises);
      const totalDuePayments = duePaymentsCounts.reduce((sum, count) => sum + count, 0);
      expect(totalDuePayments).toBe(3);
    });

    it('should handle auto-exemption for old dues on new players', async () => {
      // Given: CSV with old archived dues for new players
      const csvContent = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Old Season 2020;5000;01-09-2020;YES;New Player;;STATUS_UNPAID;
Current Season;5000;01-09-2024;NO;New Player;;STATUS_UNPAID;`;

      // When: Importing the CSV
      const result = await importDuesCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Old due should be auto-exempted
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('Auto-exempted'))).toBe(true);
      expect(result.recordsCreated).toBe(2);

      // Verify one due payment is exempt
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      const playerId = playersSnapshot.docs[0].id;
      const duePaymentsSnapshot = await getDocs(
        collection(firestore, `teams/${TEAM_ID}/players/${playerId}/duePayments`)
      );

      const duePayments = duePaymentsSnapshot.docs.map(doc => doc.data());
      const exemptDuePayment = duePayments.find(dp => dp.exempt);
      expect(exemptDuePayment).toBeDefined();
    });

    it('should skip rows with missing or unknown player names', async () => {
      // Given: CSV with invalid player names
      const csvContent = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Saison2425;5000;01-09-2024;NO;;;STATUS_UNPAID;
Saison2425;5000;01-09-2024;NO;Unknown;;STATUS_UNPAID;
Saison2425;5000;01-09-2024;NO;Valid Player;;STATUS_UNPAID;`;

      // When: Importing the CSV
      const result = await importDuesCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Invalid rows should be skipped
      expect(result.rowsProcessed).toBe(3);
      expect(result.recordsCreated).toBe(1); // Only valid player
      expect(result.warnings.some(w => w.includes('missing or unknown'))).toBe(true);
    });

    it('should handle invalid amounts gracefully', async () => {
      // Given: CSV with invalid amount
      const csvContent = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Saison2425;invalid;01-09-2024;NO;Test Player;;STATUS_UNPAID;`;

      // When: Importing the CSV
      const result = await importDuesCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Row should be skipped with warning
      expect(result.rowsProcessed).toBe(1);
      expect(result.recordsCreated).toBe(0);
      expect(result.warnings.some(w => w.includes('Invalid amount'))).toBe(true);
    });
  });

  describe('Punishments CSV Import', () => {
    it('should import punishments CSV and classify as fines/drinks', async () => {
      // Given: Valid punishments CSV with mixed types
      const csvContent = `penatly_user;penatly_reason;penatly_amount;penatly_created;penatly_paid
John Doe;Late to practice;1000;15-10-2024;STATUS_UNPAID
John Doe;Beer;350;16-10-2024;STATUS_PAID
Jane Smith;Forgot equipment;1500;17-10-2024;STATUS_UNPAID
Jane Smith;Wasser;250;18-10-2024;STATUS_UNPAID`;

      // When: Importing the CSV
      const result = await importPunishmentsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Import should succeed
      expect(result.success).toBe(true);
      expect(result.rowsProcessed).toBe(4);
      expect(result.playersCreated).toBe(2); // John and Jane
      expect(result.recordsCreated).toBe(4);

      // Verify players were created under team
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      expect(playersSnapshot.size).toBe(2);

      // Verify fines and beverages were created under team players
      const johnDoc = playersSnapshot.docs.find(doc => doc.data().name === 'John Doe');
      expect(johnDoc).toBeDefined();

      const finesSnapshot = await getDocs(
        collection(firestore, `teams/${TEAM_ID}/players/${johnDoc!.id}/fines`)
      );
      expect(finesSnapshot.size).toBe(1); // "Late to practice"

      const beverageConsumptionsSnapshot = await getDocs(
        collection(firestore, `teams/${TEAM_ID}/players/${johnDoc!.id}/beverageConsumptions`)
      );
      expect(beverageConsumptionsSnapshot.size).toBe(1); // "Beer"

      // Verify beverages collection
      const beveragesSnapshot = await getDocs(collection(firestore, 'beverages'));
      expect(beveragesSnapshot.size).toBe(1);
    });

    it('should import "Guthaben" as payment (credit)', async () => {
      // Given: CSV with Guthaben entries
      const csvContent = `penatly_user;penatly_reason;penatly_amount;penatly_created;penatly_paid
Alice;Guthaben;10000;01-09-2024;STATUS_PAID
Alice;Late;500;05-09-2024;STATUS_UNPAID`;

      // When: Importing the CSV
      const result = await importPunishmentsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Guthaben should be imported as payment
      expect(result.success).toBe(true);
      expect(result.recordsCreated).toBe(2);

      // Verify payment was created (not fine)
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      const playerId = playersSnapshot.docs[0].id;

      const paymentsSnapshot = await getDocs(
        collection(firestore, `teams/${TEAM_ID}/players/${playerId}/payments`)
      );
      expect(paymentsSnapshot.size).toBe(1); // Guthaben as payment

      const paymentData = paymentsSnapshot.docs[0].data();
      expect(paymentData.reason).toBe('Guthaben');
      expect(paymentData.amount).toBe(100); // 10000 cents = 100 EUR
      expect(paymentData.paid).toBe(true);
      expect(paymentData.teamId).toBe(TEAM_ID);
    });

    it('should skip zero-amount penalties', async () => {
      // Given: CSV with zero amount
      const csvContent = `penatly_user;penatly_reason;penatly_amount;penatly_created;penatly_paid
Test Player;Free pass;0;01-09-2024;STATUS_UNPAID`;

      // When: Importing the CSV
      const result = await importPunishmentsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Should be skipped
      expect(result.rowsProcessed).toBe(1);
      expect(result.recordsCreated).toBe(0);
      expect(result.warnings.some(w => w.includes('zero-amount'))).toBe(true);
    });

    it('should handle paid status from date fields', async () => {
      // Given: CSV with date in paid field
      const csvContent = `penatly_user;penatly_reason;penatly_amount;penatly_created;penatly_paid
Test Player;Late;1000;01-09-2024;15-09-2024`;

      // When: Importing the CSV
      const result = await importPunishmentsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Should be marked as paid with paidAt date
      expect(result.success).toBe(true);

      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      const playerId = playersSnapshot.docs[0].id;
      const finesSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players/${playerId}/fines`));

      const fineData = finesSnapshot.docs[0].data();
      expect(fineData.paid).toBe(true);
      expect(fineData.paidAt).toBeDefined();
      expect(fineData.teamId).toBe(TEAM_ID);
    });

    it('should set teamId on all imported records', async () => {
      // Given: CSV with a fine entry
      const csvContent = `penatly_user;penatly_reason;penatly_amount;penatly_created;penatly_paid
Player A;Late;1000;01-09-2024;STATUS_UNPAID`;

      // When: Importing the CSV
      const result = await importPunishmentsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Fine should have teamId field
      expect(result.success).toBe(true);
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      const playerId = playersSnapshot.docs[0].id;
      const finesSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players/${playerId}/fines`));
      expect(finesSnapshot.docs[0].data().teamId).toBe(TEAM_ID);
    });
  });

  describe('Transactions CSV Import', () => {
    it('should import transactions and create payments', async () => {
      // Given: Valid transactions CSV
      const csvContent = `transaction_date;transaction_amount;transaction_subject
01-09-2024;10000;Einzahlung: Alice (Cash)
05-09-2024;5000;Strafe: Bob (Late to practice)`;

      // When: Importing the CSV
      const result = await importTransactionsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Import should succeed
      expect(result.success).toBe(true);
      expect(result.rowsProcessed).toBe(2);
      expect(result.playersCreated).toBe(2); // Alice and Bob
      expect(result.recordsCreated).toBe(2);

      // Verify payments were created under team players
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      const aliceDoc = playersSnapshot.docs.find(doc => doc.data().name === 'Alice');
      expect(aliceDoc).toBeDefined();

      const paymentsSnapshot = await getDocs(
        collection(firestore, `teams/${TEAM_ID}/players/${aliceDoc!.id}/payments`)
      );
      expect(paymentsSnapshot.size).toBe(1);

      const paymentData = paymentsSnapshot.docs[0].data();
      expect(paymentData.amount).toBe(100); // 10000 cents = 100 EUR
      expect(paymentData.teamId).toBe(TEAM_ID);
    });

    it('should skip Beiträge transactions (handled by dues CSV)', async () => {
      // Given: CSV with Beiträge (membership dues)
      const csvContent = `transaction_date;transaction_amount;transaction_subject
01-09-2024;5000;Beitrag: Alice (Season 24/25)
05-09-2024;10000;Einzahlung: Bob (Cash)`;

      // When: Importing the CSV
      const result = await importTransactionsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Beiträge should be skipped
      expect(result.rowsProcessed).toBe(2);
      expect(result.recordsCreated).toBe(1); // Only Bob's payment
      expect(result.warnings.some(w => w.includes('Beiträge'))).toBe(true);
    });

    it('should handle storno (negative amount) transactions', async () => {
      // Given: CSV with negative amount (storno)
      const csvContent = `transaction_date;transaction_amount;transaction_subject
01-09-2024;-5000;Storno: Alice (Cancelled)`;

      // When: Importing the CSV
      const result = await importTransactionsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Storno should be imported with warning
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('Storno'))).toBe(true);

      // Verify payment is created as unpaid
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      const playerId = playersSnapshot.docs[0].id;
      const paymentsSnapshot = await getDocs(
        collection(firestore, `teams/${TEAM_ID}/players/${playerId}/payments`)
      );

      const paymentData = paymentsSnapshot.docs[0].data();
      expect(paymentData.paid).toBe(false); // Storno is unpaid
      expect(paymentData.amount).toBe(50); // Absolute value
    });

    it('should handle malformed transaction subjects', async () => {
      // Given: CSV with malformed subject (no colon)
      const csvContent = `transaction_date;transaction_amount;transaction_subject
01-09-2024;10000;Invalid Format`;

      // When: Importing the CSV
      const result = await importTransactionsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Row should be skipped with warning
      expect(result.rowsProcessed).toBe(1);
      expect(result.recordsCreated).toBe(0);
      expect(result.warnings.some(w => w.includes('Could not parse'))).toBe(true);
    });
  });

  describe('CSV Import Error Handling', () => {
    it('should handle BOM (Byte Order Mark) in CSV', async () => {
      // Given: CSV with BOM
      const csvWithBOM = '\uFEFF' + `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Saison2425;5000;01-09-2024;NO;Test Player;;STATUS_UNPAID;`;

      // When: Importing the CSV
      const result = await importDuesCSVToFirestore(firestore, TEAM_ID, csvWithBOM);

      // Then: Should handle BOM correctly
      expect(result.success).toBe(true);
      expect(result.recordsCreated).toBe(1);
    });

    it('should handle empty CSV gracefully', async () => {
      // Given: Empty CSV
      const csvContent = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date`;

      // When: Importing the CSV
      const result = await importDuesCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Should succeed with zero records
      expect(result.success).toBe(true);
      expect(result.rowsProcessed).toBe(0);
      expect(result.recordsCreated).toBe(0);
    });

    it('should collect multiple errors without failing entire import', async () => {
      // Given: CSV with multiple problematic rows
      const csvContent = `penatly_user;penatly_reason;penatly_amount;penatly_created;penatly_paid
Valid Player;Late;1000;01-09-2024;STATUS_UNPAID
;Invalid;1000;01-09-2024;STATUS_UNPAID
Unknown;Invalid;1000;01-09-2024;STATUS_UNPAID
Valid Player 2;Fine;500;01-09-2024;STATUS_UNPAID`;

      // When: Importing the CSV
      const result = await importPunishmentsCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: Valid rows should be imported, invalid skipped
      expect(result.rowsProcessed).toBe(4);
      expect(result.recordsCreated).toBe(2); // Only valid players
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Large Batch Import', () => {
    it('should handle batch imports (> 500 records)', async () => {
      // Given: Large CSV dataset
      const rows = [];
      rows.push('due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date');

      for (let i = 1; i <= 600; i++) {
        rows.push(`Saison2425;5000;01-09-2024;NO;Player${i};;STATUS_UNPAID;`);
      }

      const csvContent = rows.join('\n');

      // When: Importing large CSV
      const result = await importDuesCSVToFirestore(firestore, TEAM_ID, csvContent);

      // Then: All records should be imported successfully
      expect(result.success).toBe(true);
      expect(result.rowsProcessed).toBe(600);
      expect(result.playersCreated).toBe(600);
      expect(result.recordsCreated).toBe(600);

      // Verify players were created under team
      const playersSnapshot = await getDocs(collection(firestore, `teams/${TEAM_ID}/players`));
      expect(playersSnapshot.size).toBe(600);
    });
  });

  describe('Progress Callback', () => {
    it('should call progress callback during import', async () => {
      // Given: CSV with multiple rows
      const csvContent = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Saison2425;5000;01-09-2024;NO;Player 1;;STATUS_UNPAID;
Saison2425;5000;01-09-2024;NO;Player 2;;STATUS_UNPAID;
Saison2425;5000;01-09-2024;NO;Player 3;;STATUS_UNPAID;`;

      const progressCalls: Array<{ progress: number; total: number }> = [];

      // When: Importing with progress callback
      const result = await importDuesCSVToFirestore(
        firestore,
        TEAM_ID,
        csvContent,
        (progress, total) => {
          progressCalls.push({ progress, total });
        }
      );

      // Then: Progress callback should be called
      expect(result.success).toBe(true);
      expect(progressCalls.length).toBe(3); // One call per row
      expect(progressCalls[0]).toEqual({ progress: 1, total: 3 });
      expect(progressCalls[2]).toEqual({ progress: 3, total: 3 });
    });
  });
});
