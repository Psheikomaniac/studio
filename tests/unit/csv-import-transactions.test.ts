import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importTransactionsCSVToFirestore } from '@/lib/csv-import-firestore';
import { Firestore, getDocs } from 'firebase/firestore';

// Mock dependencies
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    writeBatch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
    })),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
}));

describe('importTransactionsCSVToFirestore Logic', () => {
    let mockFirestore: Firestore;

    beforeEach(() => {
        mockFirestore = {} as Firestore;
        vi.clearAllMocks();
        // Mock getDocs to return empty snapshot by default
        (getDocs as any).mockResolvedValue({
            empty: true,
            docs: [],
            size: 0
        });
    });

    it('correctly parses Beiträge transaction with embedded user and due name', async () => {
        const csvContent = `transaction_date; transaction_amount; transaction_subject
01.01.2024; 1200; Beiträge: Max Mustermann(Jahresbeitrag 2024)`;

        const result = await importTransactionsCSVToFirestore(mockFirestore, csvContent);

        // Should NOT be skipped
        expect(result.skippedItems).toHaveLength(0);

        // Should be processed
        expect(result.recordsCreated).toBe(1);

        // Should identify the player
        expect(result.playersCreated).toBe(1); // Or 0 if we mock existing players, but here we assume new
    });

    it('skips Beiträge transaction if format is invalid', async () => {
        const csvContent = `transaction_date; transaction_amount; transaction_subject
01.01.2024; 1200; Beiträge: Invalid Format`;

        const result = await importTransactionsCSVToFirestore(mockFirestore, csvContent);

        // Should be skipped
        expect(result.skippedItems).toHaveLength(1);
        expect(result.skippedItems[0].skipReason).toContain('Beiträge handled via Dues CSV');
    });
});
