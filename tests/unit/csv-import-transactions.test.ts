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

    it('skips Beiträge transaction — handled via dues CSV to avoid double-counting', async () => {
        const csvContent = `transaction_date; transaction_amount; transaction_subject
01.01.2024; 1200; Beiträge: Max Mustermann(Jahresbeitrag 2024)`;

        const result = await importTransactionsCSVToFirestore(mockFirestore, 'test-team', csvContent);

        // Beiträge must always be skipped (DuePayment is created by the dues CSV importer)
        expect(result.skippedItems).toHaveLength(1);
        expect(result.skippedItems[0].skipReason).toContain('Beiträge handled via Dues CSV');
        expect(result.recordsCreated).toBe(0);
    });

    it('skips Beiträge transaction even if format is invalid', async () => {
        const csvContent = `transaction_date; transaction_amount; transaction_subject
01.01.2024; 1200; Beiträge: Invalid Format`;

        const result = await importTransactionsCSVToFirestore(mockFirestore, 'test-team', csvContent);

        expect(result.skippedItems).toHaveLength(1);
        expect(result.skippedItems[0].skipReason).toContain('Beiträge handled via Dues CSV');
    });

    it('skips Strafen settlement transaction — fine paid-status comes from punishments CSV', async () => {
        const csvContent = `transaction_date; transaction_amount; transaction_subject
01.01.2024; 500; Strafen: Max Mustermann (Zu spät)`;

        const result = await importTransactionsCSVToFirestore(mockFirestore, 'test-team', csvContent);

        expect(result.skippedItems).toHaveLength(1);
        expect(result.skippedItems[0].skipReason).toContain('Strafen settlement');
        expect(result.recordsCreated).toBe(0);
    });

    it('skips Strafen transaction even when category is Guthaben — Guthaben comes from punishments CSV only', async () => {
        const csvContent = `transaction_date; transaction_amount; transaction_subject
01.01.2024; 500; Strafen: Max Mustermann (Guthaben)`;

        const result = await importTransactionsCSVToFirestore(mockFirestore, 'test-team', csvContent);

        // Guthaben in Strafen subject is skipped: the authoritative source is the Punishments CSV.
        // Importing from both CSVs would double-count the credit.
        expect(result.skippedItems).toHaveLength(1);
        expect(result.skippedItems[0].skipReason).toContain('Guthaben aus Punishments-CSV');
        expect(result.recordsCreated).toBe(0);
    });
});
