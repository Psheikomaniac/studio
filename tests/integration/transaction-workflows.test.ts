/**
 * Integration Tests: Transaction Workflows
 * Tests complete fine/payment/beverage transaction workflows with Firebase operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestFirestore } from './setup';
import { FinesService } from '@/services/fines.service';
import { PaymentsService } from '@/services/payments.service';
import { BalanceService } from '@/services/balance.service';
import {
  seedTeamPlayer,
  clearCollection,
  seedTeamPayment,
  seedTeamFine,
  seedBeverage,
} from './helpers/seed-data';
import {
  createPlayer,
  createFine,
  createPayment,
  createBeverage,
} from './helpers/test-builders';
import { getDocs, collection, runTransaction } from 'firebase/firestore';

describe('Integration: Transaction Workflows', () => {
  let firestore: ReturnType<typeof getTestFirestore>;
  let balanceService: BalanceService;
  const TEAM_ID = 'team-integration-1';
  const testPlayerId = 'test-player-1';

  beforeEach(async () => {
    firestore = getTestFirestore();
    balanceService = new BalanceService();

    // Clean up
    await clearCollection(firestore, 'teams');
    await clearCollection(firestore, 'beverages');

    // Seed test player
    const player = createPlayer(testPlayerId).withName('Transaction Test Player').build();
    await seedTeamPlayer(firestore, TEAM_ID, player);
  });

  describe('Fine Creation with Auto-Payment', () => {
    it('should create unpaid fine when player has zero balance (Given-When-Then)', async () => {
      // Given: Player with zero balance
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);

      // When: Creating a fine
      const result = await finesService.createFine(
        {
          userId: testPlayerId,
          reason: 'Late to practice',
          amount: 10,
          date: new Date().toISOString(),
        },
        { playerBalance: 0 }
      );

      // Then: Fine should be created as unpaid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBeUndefined();
      expect(result.data?.amount).toBe(10);
    });

    it('should auto-pay fine when player has sufficient balance', async () => {
      // Given: Player with balance of 100
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);

      // When: Creating a fine of 10
      const result = await finesService.createFine(
        {
          userId: testPlayerId,
          reason: 'Late to practice',
          amount: 10,
          date: new Date().toISOString(),
        },
        { playerBalance: 100 }
      );

      // Then: Fine should be auto-paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.amountPaid).toBe(10);
      expect(result.data?.paidAt).toBeDefined();
    });

    it('should partially pay fine when player has insufficient balance', async () => {
      // Given: Player with balance of 5
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);

      // When: Creating a fine of 10
      const result = await finesService.createFine(
        {
          userId: testPlayerId,
          reason: 'Late to practice',
          amount: 10,
          date: new Date().toISOString(),
        },
        { playerBalance: 5 }
      );

      // Then: Fine should be partially paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBe(5);
      expect(result.data?.amount).toBe(10);
    });
  });

  describe('Payment Creation Workflow', () => {
    it('should create payment as always paid (credit)', async () => {
      // Given: Payment service for player
      const paymentsService = new PaymentsService(firestore, TEAM_ID, testPlayerId);

      // When: Creating a payment
      const result = await paymentsService.createPayment({
        userId: testPlayerId,
        reason: 'Season membership',
        amount: 150,
        date: new Date().toISOString(),
      });

      // Then: Payment should be created as paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.paidAt).toBeDefined();
      expect(result.data?.amount).toBe(150);

      // Verify in Firestore
      const paymentsSnapshot = await getDocs(
        collection(firestore, `teams/${TEAM_ID}/players/${testPlayerId}/payments`)
      );
      expect(paymentsSnapshot.size).toBe(1);
      const paymentData = paymentsSnapshot.docs[0].data();
      expect(paymentData.paid).toBe(true);
    });

    it('should create multiple payments and retrieve them', async () => {
      // Given: Multiple payments
      const paymentsService = new PaymentsService(firestore, TEAM_ID, testPlayerId);

      await paymentsService.createPayment({
        userId: testPlayerId,
        reason: 'Payment 1',
        amount: 50,
        date: new Date().toISOString(),
      });

      await paymentsService.createPayment({
        userId: testPlayerId,
        reason: 'Payment 2',
        amount: 75,
        date: new Date().toISOString(),
      });

      // When: Retrieving all payments
      const result = await paymentsService.getAll();

      // Then: All payments should be returned
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.every(p => p.paid)).toBe(true);
    });
  });

  describe('Fine Payment Status Toggle', () => {
    it('should toggle fine from unpaid to paid', async () => {
      // Given: An unpaid fine
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);
      const fine = createFine(testPlayerId).withAmount(20).build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine, teamId: TEAM_ID, userId: testPlayerId });

      // When: Toggling to paid
      const result = await finesService.toggleFinePaid(fine.id, true);

      // Then: Fine should be marked as paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.paidAt).toBeDefined();
      expect(result.data?.amountPaid).toBe(20);
    });

    it('should toggle fine from paid to unpaid', async () => {
      // Given: A paid fine
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);
      const fine = createFine(testPlayerId).withAmount(20).paid().build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine, teamId: TEAM_ID, userId: testPlayerId });

      // When: Toggling to unpaid
      const result = await finesService.toggleFinePaid(fine.id, false);

      // Then: Fine should be marked as unpaid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.paidAt).toBeNull();
    });
  });

  describe('Fine Update Payment Status', () => {
    it('should apply additional payment to partially paid fine', async () => {
      // Given: A partially paid fine (10 EUR, 3 EUR already paid)
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);
      const fine = createFine(testPlayerId).withAmount(10).partiallyPaid(3).build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine, teamId: TEAM_ID, userId: testPlayerId });

      // When: Applying additional 4 EUR payment
      const result = await finesService.updateFinePayment(fine.id, 4);

      // Then: Fine should have 7 EUR paid (still unpaid)
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false);
      expect(result.data?.amountPaid).toBe(7);
      expect(result.data?.amount).toBe(10);
    });

    it('should mark fine as paid when additional payment completes it', async () => {
      // Given: A partially paid fine (10 EUR, 7 EUR already paid)
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);
      const fine = createFine(testPlayerId).withAmount(10).partiallyPaid(7).build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine, teamId: TEAM_ID, userId: testPlayerId });

      // When: Applying additional 5 EUR payment (more than remaining)
      const result = await finesService.updateFinePayment(fine.id, 5);

      // Then: Fine should be marked as paid
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.amountPaid).toBe(12); // 7 + 5
      expect(result.data?.paidAt).toBeDefined();
    });
  });

  describe('Balance Calculation with Transactions', () => {
    it('should calculate correct balance with multiple transaction types', async () => {
      // Given: Player with payments, fines, and beverages
      const payment1 = createPayment(testPlayerId).withAmount(100).build();
      const payment2 = createPayment(testPlayerId).withAmount(50).build();
      await seedTeamPayment(firestore, TEAM_ID, testPlayerId, { ...payment1, teamId: TEAM_ID, userId: testPlayerId });
      await seedTeamPayment(firestore, TEAM_ID, testPlayerId, { ...payment2, teamId: TEAM_ID, userId: testPlayerId });

      const fine1 = createFine(testPlayerId).withAmount(15).build(); // unpaid
      const fine2 = createFine(testPlayerId).withAmount(10).partiallyPaid(5).build(); // 5 remaining
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine1, teamId: TEAM_ID, userId: testPlayerId });
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine2, teamId: TEAM_ID, userId: testPlayerId });

      const beverage = createBeverage('bev1').withName('Beer').withPrice(3.5).build();
      await seedBeverage(firestore, beverage);
      const beverageFine = {
        ...createFine(testPlayerId).withAmount(3.5).build(),
        fineType: 'beverage' as const,
        beverageId: beverage.id,
        teamId: TEAM_ID,
        userId: testPlayerId,
      };
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, beverageFine);

      // When: Calculating balance
      const paymentsService = new PaymentsService(firestore, TEAM_ID, testPlayerId);
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);

      const paymentsResult = await paymentsService.getAll();
      const finesResult = await finesService.getAll();

      const balance = balanceService.calculatePlayerBalance(
        testPlayerId,
        paymentsResult.data || [],
        finesResult.data || [],
        [],
      );

      // Then: Balance = 150 (payments) - 15 (fine1) - 5 (fine2 remaining) - 3.5 (beverage fine) = 126.5
      expect(balance).toBe(126.5);
    });

    it('should calculate negative balance when debits exceed credits', async () => {
      // Given: Small payment and large fine
      const payment = createPayment(testPlayerId).withAmount(10).build();
      await seedTeamPayment(firestore, TEAM_ID, testPlayerId, { ...payment, teamId: TEAM_ID, userId: testPlayerId });

      const fine = createFine(testPlayerId).withAmount(50).build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine, teamId: TEAM_ID, userId: testPlayerId });

      // When: Calculating balance
      const paymentsService = new PaymentsService(firestore, TEAM_ID, testPlayerId);
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);

      const paymentsResult = await paymentsService.getAll();
      const finesResult = await finesService.getAll();

      const balance = balanceService.calculatePlayerBalance(
        testPlayerId,
        paymentsResult.data || [],
        finesResult.data || [],
        [],
      );

      // Then: Balance = 10 - 50 = -40
      expect(balance).toBe(-40);
    });
  });

  describe('Transaction Integrity with Firestore Transactions', () => {
    it('should rollback on transaction failure', async () => {
      // Given: Initial state
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);
      const initialFine = createFine(testPlayerId).withAmount(10).build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...initialFine, teamId: TEAM_ID, userId: testPlayerId });

      // When: Attempting a transaction that will fail
      try {
        await runTransaction(firestore, async (transaction) => {
          const fineRef = finesService.getFineRef(initialFine.id);
          await transaction.get(fineRef);

          // Update the fine
          transaction.update(fineRef, { paid: true, paidAt: new Date().toISOString() });

          // Force an error
          throw new Error('Simulated transaction failure');
        });
      } catch {
        // Expected to fail
      }

      // Then: Fine should remain unchanged
      const result = await finesService.getById(initialFine.id);
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(false); // Should not be changed
    });

    it('should commit all changes in successful transaction', async () => {
      // Given: Two fines to update
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);
      const fine1 = createFine(testPlayerId, 'fine1').withAmount(10).build();
      const fine2 = createFine(testPlayerId, 'fine2').withAmount(15).build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine1, teamId: TEAM_ID, userId: testPlayerId });
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine2, teamId: TEAM_ID, userId: testPlayerId });

      // When: Updating both in a transaction
      await runTransaction(firestore, async (transaction) => {
        const fine1Ref = finesService.getFineRef(fine1.id);
        const fine2Ref = finesService.getFineRef(fine2.id);

        transaction.update(fine1Ref, { paid: true, paidAt: new Date().toISOString() });
        transaction.update(fine2Ref, { paid: true, paidAt: new Date().toISOString() });
      });

      // Then: Both fines should be updated
      const result1 = await finesService.getById(fine1.id);
      const result2 = await finesService.getById(fine2.id);

      expect(result1.data?.paid).toBe(true);
      expect(result2.data?.paid).toBe(true);
    });
  });

  describe('Fine Deletion Workflow', () => {
    it('should soft delete a fine', async () => {
      // Given: An existing fine
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);
      const fine = createFine(testPlayerId).withAmount(10).build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine, teamId: TEAM_ID, userId: testPlayerId });

      // When: Soft deleting
      const result = await finesService.deleteFine(fine.id, { soft: true });

      // Then: Fine should be marked as deleted
      expect(result.success).toBe(true);

      const retrieveResult = await finesService.getById(fine.id);
      expect((retrieveResult.data as any)?.deleted).toBe(true);
    });

    it('should hard delete a fine', async () => {
      // Given: An existing fine
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);
      const fine = createFine(testPlayerId).withAmount(10).build();
      await seedTeamFine(firestore, TEAM_ID, testPlayerId, { ...fine, teamId: TEAM_ID, userId: testPlayerId });

      // When: Hard deleting
      const result = await finesService.deleteFine(fine.id, { soft: false });

      // Then: Fine should be removed
      expect(result.success).toBe(true);

      const retrieveResult = await finesService.getById(fine.id);
      expect(retrieveResult.success).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle updating non-existent fine', async () => {
      // Given: Non-existent fine ID
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);

      // When: Attempting to update
      const result = await finesService.toggleFinePaid('non-existent', true);

      // Then: Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle applying payment to non-existent fine', async () => {
      // Given: Non-existent fine ID
      const finesService = new FinesService(firestore, TEAM_ID, testPlayerId);

      // When: Attempting to apply payment
      const result = await finesService.updateFinePayment('non-existent', 10);

      // Then: Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
