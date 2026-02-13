import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importPunishmentsCSVToFirestore } from '@/lib/csv-import-firestore';
import { Firestore, getDocs, writeBatch } from 'firebase/firestore';

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

describe('importPunishmentsCSVToFirestore Beverage Logic', () => {
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

    const findSetCallInData = (dataMatcher: (data: any) => boolean) => {
        const batchResults = (writeBatch as any).mock.results;
        for (const result of batchResults) {
            const batchMock = result.value;
            const setCalls = batchMock.set.mock.calls;
            for (const call of setCalls) {
                const data = call[1];
                if (dataMatcher(data)) {
                    return call;
                }
            }
        }
        return undefined;
    };

    it('classifies "Kasten Bier" as FINE (not beverage)', async () => {
        const csvContent = `penatly_date;penatly_amount;penatly_reason;penatly_user
01.01.2024;1500;Kasten Bier;Max Mustermann`;

        const result = await importPunishmentsCSVToFirestore(mockFirestore, 'test-team', csvContent);

        if (result.errors.length > 0) {
            throw new Error(`Import failed with errors: ${JSON.stringify(result.errors)}`);
        }
        if (result.warnings.length > 0) {
            console.error('Import warnings:', result.warnings);
        }
        if (result.skippedItems.length > 0) {
            console.error('Skipped items:', JSON.stringify(result.skippedItems, null, 2));
        }
        console.log('Records created:', result.recordsCreated);

        // Verify classifyPunishment directly

        // Verify writeBatch was called
        expect(writeBatch).toHaveBeenCalled();

        // Get the mock object returned by writeBatch
        const batchMock = (writeBatch as any).mock.results[0].value;
        const setMock = batchMock.set;

        // Should NOT find a beverage creation call for this
        const beverageCall = setMock.mock.calls.find((call: any[]) => {
            const data = call[1];
            // Check if it looks like a beverage (has price/name) vs fine (has amount/reason)
            // Beverages have 'price', Fines have 'amount'
            return data.price !== undefined && (data.name === 'Beer/Lemonade' || data.name === 'Kasten Bier');
        });

        expect(beverageCall).toBeUndefined();

        // Verify classifyPunishment directly
        const { classifyPunishment } = await import('@/lib/csv-utils');
        const classification = classifyPunishment('Kasten Bier');
        expect(classification).toBe('FINE');

        // Should find a fine creation call
        // We need to check ALL writeBatch calls, not just the first one
        const batchResults = (writeBatch as any).mock.results;
        let fineCall = undefined;

        for (const res of batchResults) {
            const batchMock = res.value;
            const setCalls = batchMock.set.mock.calls;
            const found = setCalls.find((call: any[]) => {
                const data = call[1];
                return data.reason === 'Kasten Bier' && data.amount === 15;
            });
            if (found) {
                fineCall = found;
                break;
            }
        }

        expect(fineCall).toBeDefined();
    });

    it('maps "Bier" to "Beer/Lemonade"', async () => {
        const csvContent = `penatly_date;penatly_amount;penatly_reason;penatly_user
01.01.2024;150;Bier;Max Mustermann`;

        await importPunishmentsCSVToFirestore(mockFirestore, 'test-team', csvContent);

        const beverageCall = findSetCallInData((data) => data.name === 'Beer/Lemonade');
        expect(beverageCall).toBeDefined();
    });

    it('maps "Apfelwein" to "Appler"', async () => {
        const csvContent = `penatly_date;penatly_amount;penatly_reason;penatly_user
01.01.2024;200;Apfelwein;Max Mustermann`;

        await importPunishmentsCSVToFirestore(mockFirestore, 'test-team', csvContent);

        const beverageCall = findSetCallInData((data) => data.name === 'Appler');
        expect(beverageCall).toBeDefined();
    });

    it('maps unknown drink to "Beverages"', async () => {
        const csvContent = `penatly_date;penatly_amount;penatly_reason;penatly_user
01.01.2024;500;Mystery Drink;Max Mustermann`;

        await importPunishmentsCSVToFirestore(mockFirestore, 'test-team', csvContent);

        const beverageCall = findSetCallInData((data) => data.name === 'Beverages');
        expect(beverageCall).toBeDefined();
    });
});
