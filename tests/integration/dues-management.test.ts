/**
 * Integration Tests: Dues Management Workflows
 * Tests due payment creation, auto-payment, exemptions, and status management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestFirestore } from './setup';
import { DuesService } from '@/services/dues.service';
import { BalanceService } from '@/services/balance.service';
import { seedPlayer, seedDue, seedDuePayment, clearCollection } from './helpers/seed-data';
import { createPlayer, createDue, createDuePayment } from './helpers/test-builders';
import { getDocs, collection } from 'firebase/firestore';

describe('Integration: Dues Management', () => {
  let firestore: ReturnType<typeof getTestFirestore>;
  let balanceService: BalanceService;
  const testPlayerId = 'test-player-1';

  beforeEach(async () => {
    firestore = getTestFirestore();
    balanceService = new BalanceService();

    // Clean up
    await clearCollection(firestore, 'users');
    await clearCollection(firestore, 'dues');

    // Seed test player
    const player = createPlayer(testPlayerId).withName('Dues Test Player').build();
    await seedPlayer(firestore, player);
  });

  describe('Due Creation', () => {
    it('should create a due successfully (Given-When-Then)', async () => {
      // Given: Due data
      const due = createDue('due1').withName('Season 2024/25').withAmount(50).build();

      // When: Creating the due
      await seedDue(firestore, due);

      // Then: Due should be in Firestore
      const duesSnapshot = await getDocs(collection(firestore, 'dues'));
      expect(duesSnapshot.size).toBe(1);

      const dueData = duesSnapshot.docs[0].data();
      expect(dueData.name).toBe('Season 2024/25');
      expect(dueData.amount).toBe(50);
      expect(dueData.active).toBe(true);
    });

    it('should create archived due', async () => {
      // Given: Archived due
      const due = createDue('due1').withName('Old Season').archived().build();

      // When: Creating the due
      await seedDue(firestore, due);

      // Then: Due should be archived
      const duesSnapshot = await getDocs(collection(firestore, 'dues'));
      const dueData = duesSnapshot.docs[0].data();
      expect(dueData.archived).toBe(true);
      expect(dueData.active).toBe(false);
    });
  });

  describe('Due Payment Creation with Auto-Payment', () => {
    it('should create unpaid due payment when player has zero balance', async () => {
      // Given: Player with zero balance and a due
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      // When: Creating due payment with zero balance
      const result = await duesService.createDuePayment(
        {
          dueId: due.id,
          userId: testPlayerId,
          userName: 'Dues Test Player',
          amountDue: 50,
          exempt: false,
        },
        { playerBalance: 0 }
      );

      // Then: Due payment should be unpaid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBeUndefined();
    });

    it('should auto-pay due when player has sufficient balance', async () => {
      // Given: Player with balance of 100
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      // When: Creating due payment with sufficient balance
      const result = await duesService.createDuePayment(
        {
          dueId: due.id,
          userId: testPlayerId,
          userName: 'Dues Test Player',
          amountDue: 50,
          exempt: false,
        },
        { playerBalance: 100 }
      );

      // Then: Due payment should be paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.amountPaid).toBe(50);
      expect(result.data?.paidAt).toBeDefined();
    });

    it('should partially pay due when player has insufficient balance', async () => {
      // Given: Player with balance of 30
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      // When: Creating due payment
      const result = await duesService.createDuePayment(
        {
          dueId: due.id,
          userId: testPlayerId,
          userName: 'Dues Test Player',
          amountDue: 50,
          exempt: false,
        },
        { playerBalance: 30 }
      );

      // Then: Due payment should be partially paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBe(30);
    });

    it('should not apply auto-payment to exempt due', async () => {
      // Given: Player with balance and exempt due
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      // When: Creating exempt due payment
      const result = await duesService.createDuePayment(
        {
          dueId: due.id,
          userId: testPlayerId,
          userName: 'Dues Test Player',
          amountDue: 50,
          exempt: true,
        },
        { playerBalance: 100 } // Has balance but exempt
      );

      // Then: Due payment should be unpaid (exempt)
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBeUndefined();
      expect(result.data?.exempt).toBe(true);
    });
  });

  describe('Due Payment Status Toggle', () => {
    it('should toggle due payment from unpaid to paid', async () => {
      // Given: Unpaid due payment
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      const duePayment = createDuePayment(due.id, testPlayerId, 'Test Player')
        .withAmount(50)
        .build();
      await seedDuePayment(firestore, testPlayerId, duePayment);

      // When: Toggling to paid
      const result = await duesService.toggleDuePaid(duePayment.id, true);

      // Then: Should be marked as paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.paidAt).toBeDefined();
      expect(result.data?.amountPaid).toBe(50);
    });

    it('should toggle due payment from paid to unpaid', async () => {
      // Given: Paid due payment
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      const duePayment = createDuePayment(due.id, testPlayerId, 'Test Player')
        .withAmount(50)
        .paid()
        .build();
      await seedDuePayment(firestore, testPlayerId, duePayment);

      // When: Toggling to unpaid
      const result = await duesService.toggleDuePaid(duePayment.id, false);

      // Then: Should be marked as unpaid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.paidAt).toBeNull();
    });
  });

  describe('Due Payment Update', () => {
    it('should apply additional payment to partially paid due', async () => {
      // Given: Partially paid due (50 EUR, 20 EUR already paid)
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      const duePayment = createDuePayment(due.id, testPlayerId, 'Test Player')
        .withAmount(50)
        .partiallyPaid(20)
        .build();
      await seedDuePayment(firestore, testPlayerId, duePayment);

      // When: Applying additional 15 EUR payment
      const result = await duesService.updateDuePayment(duePayment.id, 15);

      // Then: Should have 35 EUR paid (still unpaid)
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBe(35);
    });

    it('should mark due as paid when additional payment completes it', async () => {
      // Given: Partially paid due (50 EUR, 45 EUR already paid)
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      const duePayment = createDuePayment(due.id, testPlayerId, 'Test Player')
        .withAmount(50)
        .partiallyPaid(45)
        .build();
      await seedDuePayment(firestore, testPlayerId, duePayment);

      // When: Applying additional 10 EUR payment
      const result = await duesService.updateDuePayment(duePayment.id, 10);

      // Then: Should be marked as paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.amountPaid).toBe(55);
      expect(result.data?.paidAt).toBeDefined();
    });
  });

  describe('Balance Calculation with Dues', () => {
    it('should calculate balance correctly with unpaid dues', async () => {
      // Given: Player with due payment
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      const duePayment = createDuePayment(due.id, testPlayerId, 'Test Player')
        .withAmount(50)
        .build(); // Unpaid
      await seedDuePayment(firestore, testPlayerId, duePayment);

      // When: Calculating balance
      const balance = balanceService.calculatePlayerBalance(
        testPlayerId,
        [],
        [],
        [duePayment],
        []
      );

      // Then: Balance should be -50 (unpaid due)
      expect(balance).toBe(-50);
    });

    it('should exclude exempt dues from balance calculation', async () => {
      // Given: Player with exempt and regular due
      const due1 = createDue('due1').withAmount(50).build();
      const due2 = createDue('due2').withAmount(40).build();
      await seedDue(firestore, due1);
      await seedDue(firestore, due2);

      const exemptDue = createDuePayment(due1.id, testPlayerId, 'Test Player')
        .withAmount(50)
        .exempt()
        .build();

      const regularDue = createDuePayment(due2.id, testPlayerId, 'Test Player')
        .withAmount(40)
        .build();

      await seedDuePayment(firestore, testPlayerId, exemptDue);
      await seedDuePayment(firestore, testPlayerId, regularDue);

      // When: Calculating balance
      const balance = balanceService.calculatePlayerBalance(
        testPlayerId,
        [],
        [],
        [exemptDue, regularDue],
        []
      );

      // Then: Balance should be -40 (only regular due, exempt ignored)
      expect(balance).toBe(-40);
    });

    it('should calculate balance with partially paid dues', async () => {
      // Given: Partially paid due (50 EUR, 30 EUR paid)
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      const duePayment = createDuePayment(due.id, testPlayerId, 'Test Player')
        .withAmount(50)
        .partiallyPaid(30)
        .build();
      await seedDuePayment(firestore, testPlayerId, duePayment);

      // When: Calculating balance
      const balance = balanceService.calculatePlayerBalance(
        testPlayerId,
        [],
        [],
        [duePayment],
        []
      );

      // Then: Balance should be -20 (remaining unpaid)
      expect(balance).toBe(-20);
    });
  });

  describe('Multiple Dues Per Player', () => {
    it('should handle multiple dues for same player', async () => {
      // Given: Player with multiple dues
      const duesService = new DuesService(firestore, testPlayerId);

      const due1 = createDue('due1').withName('Season 24/25').withAmount(50).build();
      const due2 = createDue('due2').withName('Tournament').withAmount(30).build();
      await seedDue(firestore, due1);
      await seedDue(firestore, due2);

      // When: Creating due payments
      await duesService.createDuePayment({
        dueId: due1.id,
        userId: testPlayerId,
        userName: 'Test Player',
        amountDue: 50,
        exempt: false,
      });

      await duesService.createDuePayment({
        dueId: due2.id,
        userId: testPlayerId,
        userName: 'Test Player',
        amountDue: 30,
        exempt: false,
      });

      // Then: Both should be created
      const duePaymentsSnapshot = await getDocs(
        collection(firestore, `users/${testPlayerId}/duePayments`)
      );
      expect(duePaymentsSnapshot.size).toBe(2);

      // Calculate total balance
      const duePayments = duePaymentsSnapshot.docs.map(doc => doc.data() as any);
      const balance = balanceService.calculatePlayerBalance(
        testPlayerId,
        [],
        [],
        duePayments,
        []
      );

      // Total: -80
      expect(balance).toBe(-80);
    });
  });

  describe('Due Deletion', () => {
    it('should soft delete due payment', async () => {
      // Given: Existing due payment
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      const duePayment = createDuePayment(due.id, testPlayerId, 'Test Player').build();
      await seedDuePayment(firestore, testPlayerId, duePayment);

      // When: Soft deleting
      const result = await duesService.deleteDuePayment(duePayment.id, { soft: true });

      // Then: Should be marked as deleted
      expect(result.success).toBe(true);

      const retrieveResult = await duesService.getById(duePayment.id);
      expect((retrieveResult.data as any)?.deleted).toBe(true);
    });

    it('should hard delete due payment', async () => {
      // Given: Existing due payment
      const duesService = new DuesService(firestore, testPlayerId);
      const due = createDue('due1').withAmount(50).build();
      await seedDue(firestore, due);

      const duePayment = createDuePayment(due.id, testPlayerId, 'Test Player').build();
      await seedDuePayment(firestore, testPlayerId, duePayment);

      // When: Hard deleting
      const result = await duesService.deleteDuePayment(duePayment.id, { soft: false });

      // Then: Should be removed
      expect(result.success).toBe(true);

      const retrieveResult = await duesService.getById(duePayment.id);
      expect(retrieveResult.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle updating non-existent due payment', async () => {
      // Given: Non-existent due payment
      const duesService = new DuesService(firestore, testPlayerId);

      // When: Attempting to update
      const result = await duesService.toggleDuePaid('non-existent', true);

      // Then: Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle applying payment to non-existent due', async () => {
      // Given: Non-existent due payment
      const duesService = new DuesService(firestore, testPlayerId);

      // When: Attempting to apply payment
      const result = await duesService.updateDuePayment('non-existent', 10);

      // Then: Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
