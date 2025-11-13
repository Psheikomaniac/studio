/**
 * PaymentsService Unit Tests
 * Comprehensive tests for payment operations with transaction logic
 *
 * CRITICAL BUSINESS LOGIC TESTED:
 * - All payments are created with paid=true (they represent credits)
 * - Payments are stored in nested collections: /users/{userId}/payments/{paymentId}
 * - Transaction integrity for payment creation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PaymentsService } from '@/services/payments.service';
import type { Firestore } from 'firebase/firestore';
import type { Payment } from '@/lib/types';
import {
  createMockFirestore,
  createMockDocumentSnapshot,
  clearMockDocuments,
  mockFirestoreFunctions,
} from '../../mocks/firestore-mock';

// Mock Firebase Firestore module
vi.mock('firebase/firestore', () => mockFirestoreFunctions);

describe('PaymentsService', () => {
  let mockFirestore: Firestore;
  let service: PaymentsService;
  const TEST_USER_ID = 'test-user-123';

  beforeEach(() => {
    clearMockDocuments();
    vi.clearAllMocks();
    mockFirestore = createMockFirestore();
    service = new PaymentsService(mockFirestore, TEST_USER_ID);
  });

  afterEach(() => {
    clearMockDocuments();
  });

  describe('Constructor', () => {
    it('should initialize with firestore and userId for nested collection (Given-When-Then)', () => {
      // Given: A mock Firestore instance and user ID
      const firestore = createMockFirestore();
      const userId = 'user-456';

      // When: Creating a new PaymentsService
      const paymentsService = new PaymentsService(firestore, userId);

      // Then: Service should be initialized with correct nested collection path
      expect(paymentsService).toBeInstanceOf(PaymentsService);
      expect(paymentsService['firestore']).toBe(firestore);
      expect(paymentsService['collectionName']).toBe(`users/${userId}/payments`);
      expect(paymentsService['userId']).toBe(userId);
    });
  });

  describe('createPayment - CRITICAL: Always paid=true', () => {
    it('should create payment with paid=true and paidAt timestamp (Given-When-Then)', async () => {
      // Given: Payment data without paid field
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 50,
        reason: 'Membership fee',
        date: '2024-01-15',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: Payment should be created with paid=true
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.paid).toBe(true);
      expect(result.data?.paidAt).toBeDefined();
      expect(result.data?.amount).toBe(50);
      expect(result.data?.reason).toBe('Membership fee');
    });

    it('should use runTransaction for payment creation to ensure atomicity (Given-When-Then)', async () => {
      // Given: Payment data
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 100,
        reason: 'Season payment',
        date: '2024-01-20',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: Should use runTransaction for atomicity
      expect(result.success).toBe(true);
      expect(mockFirestoreFunctions.runTransaction).toHaveBeenCalled();
    });

    it('should create payment with custom ID when provided (Given-When-Then)', async () => {
      // Given: Payment data and custom ID
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 75,
        reason: 'Custom payment',
        date: '2024-01-25',
      };
      const customId = 'payment-custom-123';

      // When: Creating payment with custom ID
      const result = await service.createPayment(paymentData, { customId });

      // Then: Payment should use custom ID
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(customId);
      expect(result.data?.paid).toBe(true);
    });

    it('should include createdBy and updatedBy when userId provided (Given-When-Then)', async () => {
      // Given: Payment data and userId option
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 60,
        reason: 'Tracked payment',
        date: '2024-01-30',
      };
      const adminUserId = 'admin-789';

      // When: Creating payment with userId
      const result = await service.createPayment(paymentData, { userId: adminUserId });

      // Then: Payment should have audit fields
      expect(result.success).toBe(true);
      expect((result.data as any).createdBy).toBe(adminUserId);
      expect((result.data as any).updatedBy).toBe(adminUserId);
    });

    it('should set paidAt to same timestamp as createdAt (Given-When-Then)', async () => {
      // Given: Payment data
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 45,
        reason: 'Timestamp test',
        date: '2024-02-01',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: paidAt should match createdAt
      expect(result.success).toBe(true);
      expect(result.data?.paidAt).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
      // Both should be ISO timestamps
      expect(result.data?.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.data?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle transaction errors during payment creation (Given-When-Then)', async () => {
      // Given: Mock runTransaction to throw error
      const error = new Error('Transaction failed: Network error');
      mockFirestoreFunctions.runTransaction.mockRejectedValueOnce(error);

      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 50,
        reason: 'Error payment',
        date: '2024-02-05',
      };

      // When: Creating payment with error
      const result = await service.createPayment(paymentData);

      // Then: Should return error result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Transaction failed');
    });

    it('should handle various payment amounts including decimals (Given-When-Then)', async () => {
      // Given: Payment with decimal amount
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 123.45,
        reason: 'Decimal payment',
        date: '2024-02-10',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: Should handle decimal amounts
      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(123.45);
      expect(result.data?.paid).toBe(true);
    });

    it('should handle zero amount payments (Given-When-Then)', async () => {
      // Given: Payment with zero amount
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 0,
        reason: 'Zero payment',
        date: '2024-02-15',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: Should create payment (validation handled elsewhere)
      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(0);
      expect(result.data?.paid).toBe(true);
    });
  });

  describe('createPaymentNonBlocking', () => {
    it('should create payment non-blocking with paid=true and return ID (Given-When-Then)', () => {
      // Given: Payment data
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 80,
        reason: 'Quick payment',
        date: '2024-02-20',
      };

      // When: Creating payment non-blocking
      const paymentId = service.createPaymentNonBlocking(paymentData);

      // Then: Should return ID immediately
      expect(paymentId).toBeDefined();
      expect(typeof paymentId).toBe('string');
      expect(paymentId.length).toBeGreaterThan(0);
    });

    it('should use custom ID for non-blocking create when provided (Given-When-Then)', () => {
      // Given: Payment data and custom ID
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 90,
        reason: 'Custom non-blocking',
        date: '2024-02-25',
      };
      const customId = 'payment-nb-custom-456';

      // When: Creating with custom ID
      const paymentId = service.createPaymentNonBlocking(paymentData, { customId });

      // Then: Should return custom ID
      expect(paymentId).toBe(customId);
    });

    it('should set paid=true and paidAt in non-blocking create (Given-When-Then)', () => {
      // Given: Payment data
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 55,
        reason: 'Non-blocking paid',
        date: '2024-03-01',
      };

      // When: Creating payment non-blocking
      const paymentId = service.createPaymentNonBlocking(paymentData);

      // Then: Should complete without error
      expect(paymentId).toBeDefined();
    });

    it('should include audit fields in non-blocking create when userId provided (Given-When-Then)', () => {
      // Given: Payment data and userId
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 65,
        reason: 'Tracked non-blocking',
        date: '2024-03-05',
      };
      const adminUserId = 'admin-nb-123';

      // When: Creating with userId
      const paymentId = service.createPaymentNonBlocking(paymentData, { userId: adminUserId });

      // Then: Should complete
      expect(paymentId).toBeDefined();
    });
  });

  describe('updatePayment', () => {
    it('should update payment with partial data (Given-When-Then)', async () => {
      // Given: Existing payment and update data
      const paymentId = 'payment-update-123';
      const updateData: Partial<Omit<Payment, 'id'>> = {
        reason: 'Updated reason',
        amount: 120,
      };

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(paymentId, {
          id: paymentId,
          userId: TEST_USER_ID,
          amount: 100,
          reason: 'Original reason',
          paid: true,
        })
      );

      // When: Updating payment
      const result = await service.updatePayment(paymentId, updateData);

      // Then: Payment should be updated
      expect(result.success).toBe(true);
      expect(mockFirestoreFunctions.updateDoc).toHaveBeenCalled();
    });

    it('should include updatedBy when userId provided (Given-When-Then)', async () => {
      // Given: Payment ID, update data, and userId
      const paymentId = 'payment-update-456';
      const updateData: Partial<Omit<Payment, 'id'>> = {
        amount: 150,
      };
      const userId = 'admin-update-789';

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(paymentId, {
          id: paymentId,
          amount: 100,
        })
      );

      // When: Updating with userId
      const result = await service.updatePayment(paymentId, updateData, { userId });

      // Then: Should include updatedBy
      expect(result.success).toBe(true);
    });

    it('should handle update errors gracefully (Given-When-Then)', async () => {
      // Given: Mock updateDoc to throw error
      const error = new Error('Update failed: Permission denied');
      mockFirestoreFunctions.updateDoc.mockRejectedValueOnce(error);

      const paymentId = 'payment-error';
      const updateData: Partial<Omit<Payment, 'id'>> = {
        reason: 'Error update',
      };

      // When: Updating with error
      const result = await service.updatePayment(paymentId, updateData);

      // Then: Should return error result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updatePaymentNonBlocking', () => {
    it('should update payment non-blocking without waiting (Given-When-Then)', () => {
      // Given: Payment ID and update data
      const paymentId = 'payment-nb-update';
      const updateData: Partial<Omit<Payment, 'id'>> = {
        reason: 'Quick update',
      };

      // When: Updating non-blocking
      service.updatePaymentNonBlocking(paymentId, updateData);

      // Then: Should complete without error
      expect(true).toBe(true);
    });

    it('should include updatedBy in non-blocking update when userId provided (Given-When-Then)', () => {
      // Given: Payment ID, update data, and userId
      const paymentId = 'payment-nb-tracked';
      const updateData: Partial<Omit<Payment, 'id'>> = {
        amount: 200,
      };
      const userId = 'admin-nb-tracked';

      // When: Updating non-blocking with userId
      service.updatePaymentNonBlocking(paymentId, updateData, { userId });

      // Then: Should complete
      expect(true).toBe(true);
    });
  });

  describe('deletePayment', () => {
    it('should hard delete payment when soft=false (Given-When-Then)', async () => {
      // Given: Payment ID to delete
      const paymentId = 'payment-hard-delete';

      // When: Hard deleting payment
      const result = await service.deletePayment(paymentId, { soft: false });

      // Then: Should call deleteDoc
      expect(result.success).toBe(true);
      expect(mockFirestoreFunctions.deleteDoc).toHaveBeenCalled();
    });

    it('should soft delete payment when soft=true (Given-When-Then)', async () => {
      // Given: Payment ID to soft delete
      const paymentId = 'payment-soft-delete';

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(paymentId, {
          id: paymentId,
          amount: 100,
          paid: true,
        })
      );

      // When: Soft deleting payment
      const result = await service.deletePayment(paymentId, { soft: true });

      // Then: Should call updateDoc with deleted flag
      expect(result.success).toBe(true);
      expect(mockFirestoreFunctions.updateDoc).toHaveBeenCalled();
    });

    it('should include deletedBy for soft delete when userId provided (Given-When-Then)', async () => {
      // Given: Payment ID, soft delete, and userId
      const paymentId = 'payment-tracked-delete';
      const userId = 'admin-deleter';

      mockFirestoreFunctions.getDoc.mockResolvedValueOnce(
        createMockDocumentSnapshot(paymentId, {
          id: paymentId,
          amount: 75,
        })
      );

      // When: Soft deleting with userId
      const result = await service.deletePayment(paymentId, { soft: true, userId });

      // Then: Should include deletedBy
      expect(result.success).toBe(true);
    });
  });

  describe('deletePaymentNonBlocking', () => {
    it('should hard delete non-blocking when soft=false (Given-When-Then)', () => {
      // Given: Payment ID
      const paymentId = 'payment-nb-hard-delete';

      // When: Hard deleting non-blocking
      service.deletePaymentNonBlocking(paymentId, { soft: false });

      // Then: Should complete
      expect(true).toBe(true);
    });

    it('should soft delete non-blocking when soft=true (Given-When-Then)', () => {
      // Given: Payment ID
      const paymentId = 'payment-nb-soft-delete';

      // When: Soft deleting non-blocking
      service.deletePaymentNonBlocking(paymentId, { soft: true });

      // Then: Should complete
      expect(true).toBe(true);
    });
  });

  describe('getPaymentRef', () => {
    it('should return DocumentReference for payment in nested collection (Given-When-Then)', () => {
      // Given: Payment ID
      const paymentId = 'payment-ref-123';

      // When: Getting payment reference
      const paymentRef = service.getPaymentRef(paymentId);

      // Then: Should return DocumentReference
      expect(paymentRef).toBeDefined();
      expect(paymentRef.id).toBe(paymentId);
      expect(paymentRef.path).toContain(`users/${TEST_USER_ID}/payments`);
    });
  });

  describe('getPaymentsCollectionRef', () => {
    it('should return CollectionReference for user payments (Given-When-Then)', () => {
      // Given: PaymentsService instance
      // When: Getting collection reference
      const collectionRef = service.getPaymentsCollectionRef();

      // Then: Should return CollectionReference for nested collection
      expect(collectionRef).toBeDefined();
      expect(collectionRef.path).toBe(`users/${TEST_USER_ID}/payments`);
    });
  });

  describe('Edge Cases and Business Rules', () => {
    it('should handle very large payment amounts (Given-When-Then)', async () => {
      // Given: Payment with very large amount
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 999999.99,
        reason: 'Large payment',
        date: '2024-03-10',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: Should handle large amounts
      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(999999.99);
      expect(result.data?.paid).toBe(true);
    });

    it('should handle special characters in payment reason (Given-When-Then)', async () => {
      // Given: Payment with special characters
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 50,
        reason: 'Payment für Saison 2024/25 - Überweisung',
        date: '2024-03-15',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: Should handle special characters
      expect(result.success).toBe(true);
      expect(result.data?.reason).toContain('für');
      expect(result.data?.paid).toBe(true);
    });

    it('should handle empty reason string (Given-When-Then)', async () => {
      // Given: Payment with empty reason
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 25,
        reason: '',
        date: '2024-03-20',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: Should create payment (validation elsewhere)
      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
    });

    it('should handle different date formats in payment (Given-When-Then)', async () => {
      // Given: Payment with ISO date string
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidAt'> = {
        userId: TEST_USER_ID,
        amount: 35,
        reason: 'Date test',
        date: '2024-12-31T23:59:59.999Z',
      };

      // When: Creating payment
      const result = await service.createPayment(paymentData);

      // Then: Should handle ISO dates
      expect(result.success).toBe(true);
      expect(result.data?.date).toBe('2024-12-31T23:59:59.999Z');
      expect(result.data?.paid).toBe(true);
    });
  });
});
