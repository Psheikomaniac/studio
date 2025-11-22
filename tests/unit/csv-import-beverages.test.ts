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

        await importPunishmentsCSVToFirestore(mockFirestore, csvContent);

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

        // Should find a fine creation call
        const allSetCalls = setMock.mock.calls.map((c: any[]) => c[1]);
        const fineCall = allSetCalls.find((data: any) =>
            data.reason === 'Kasten Bier' && data.amount === 15
        );

        if (!fineCall) {
            console.error('FAILED to find Kasten Bier fine. Actual set calls:', JSON.stringify(allSetCalls, null, 2));
        }

        expect(fineCall).toBeDefined();
    });

    it('maps "Bier" to "Beer/Lemonade"', async () => {
        const csvContent = `penatly_date;penatly_amount;penatly_reason;penatly_user
01.01.2024;150;Bier;Max Mustermann`;

        await importPunishmentsCSVToFirestore(mockFirestore, csvContent);

        const beverageCall = findSetCallInData((data) => data.name === 'Beer/Lemonade');
        expect(beverageCall).toBeDefined();
    });

    it('maps "Apfelwein" to "Appler"', async () => {
        const csvContent = `penatly_date;penatly_amount;penatly_reason;penatly_user
01.01.2024;200;Apfelwein;Max Mustermann`;

        await importPunishmentsCSVToFirestore(mockFirestore, csvContent);

        const beverageCall = findSetCallInData((data) => data.name === 'Appler');
        expect(beverageCall).toBeDefined();
    });

    it('maps unknown drink to "Beverages"', async () => {
        const csvContent = `penatly_date;penatly_amount;penatly_reason;penatly_user
01.01.2024;500;Mystery Drink;Max Mustermann`;

        await importPunishmentsCSVToFirestore(mockFirestore, csvContent);

        const beverageCall = findSetCallInData((data) => data.name === 'Beverages');
        expect(beverageCall).toBeDefined();
    });
});
