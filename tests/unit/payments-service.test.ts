import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from '@/services/payments.service';
import {
    doc,
    runTransaction,
    increment
} from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        collection: vi.fn(),
        doc: vi.fn(() => ({ id: 'mockRef' })),
        runTransaction: vi.fn(),
        increment: vi.fn((n) => ({ type: 'increment', value: n })),
    };
});

describe('PaymentsService', () => {
    let service: PaymentsService;
    const mockFirestore = {} as any;
    const userId = 'user123';
    const paymentId = 'payment123';

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PaymentsService(mockFirestore, userId);
    });

    describe('togglePaymentPaid', () => {
        it('should mark unpaid payment as paid and credit balance', async () => {
            const mockPayment = {
                id: paymentId,
                amount: 50,
                paid: false,
                paidAt: null,
            };

            const mockTransaction = {
                get: vi.fn().mockResolvedValue({
                    exists: () => true,
                    data: () => mockPayment,
                }),
                update: vi.fn(),
            };

            (runTransaction as any).mockImplementation(async (_: any, callback: any) => {
                return callback(mockTransaction);
            });

            const result = await service.togglePaymentPaid(paymentId, true);

            expect(result.success).toBe(true);
            expect(result.data?.paid).toBe(true);
            expect(result.data?.paidAt).toBeDefined();

            // Check balance update (credit 50)
            expect(mockTransaction.update).toHaveBeenCalledWith(
                expect.anything(), // userRef
                { balance: { type: 'increment', value: 50 } }
            );
        });

        it('should mark paid payment as unpaid and debit balance', async () => {
            const mockPayment = {
                id: paymentId,
                amount: 50,
                paid: true,
                paidAt: '2024-01-01T12:00:00Z',
            };

            const mockTransaction = {
                get: vi.fn().mockResolvedValue({
                    exists: () => true,
                    data: () => mockPayment,
                }),
                update: vi.fn(),
            };

            (runTransaction as any).mockImplementation(async (_: any, callback: any) => {
                return callback(mockTransaction);
            });

            const result = await service.togglePaymentPaid(paymentId, false);

            expect(result.success).toBe(true);
            expect(result.data?.paid).toBe(false);
            expect(result.data?.paidAt).toBeNull();

            // Check balance update (debit 50)
            expect(mockTransaction.update).toHaveBeenCalledWith(
                expect.anything(), // userRef
                { balance: { type: 'increment', value: -50 } }
            );
        });

        it('should do nothing if status is unchanged', async () => {
            const mockPayment = {
                id: paymentId,
                amount: 50,
                paid: true,
            };

            const mockTransaction = {
                get: vi.fn().mockResolvedValue({
                    exists: () => true,
                    data: () => mockPayment,
                }),
                update: vi.fn(),
            };

            (runTransaction as any).mockImplementation(async (_: any, callback: any) => {
                return callback(mockTransaction);
            });

            const result = await service.togglePaymentPaid(paymentId, true);

            expect(result.success).toBe(true);
            expect(mockTransaction.update).not.toHaveBeenCalled();
        });
    });
});
