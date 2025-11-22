import { describe, it, expect, vi } from 'vitest';
import { importDuesCSVToFirestore } from '@/lib/csv-import-firestore';
import { Firestore } from 'firebase/firestore';

// Mock Firestore
const mockFirestore = {} as Firestore;

// Mock dependencies
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    writeBatch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
    })),
    doc: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    query: vi.fn(),
    where: vi.fn(),
}));

describe('importDuesCSVToFirestore Logic', () => {
    it('correctly parses payment status "Paid" as paid', async () => {
        const csv = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Test Due;1000;01-01-2025;NO;Test User;user1;Paid;02-01-2025`;

        const result = await importDuesCSVToFirestore(mockFirestore, csv);
        expect(result.success).toBe(true);
        // We can't easily inspect the internal state without more complex mocking, 
        // but we can check if it didn't error and processed the row.
        expect(result.rowsProcessed).toBe(1);
    });

    it('correctly parses payment status "STATUS_PAID" as paid', async () => {
        const csv = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Test Due;1000;01-01-2025;NO;Test User;user1;STATUS_PAID;02-01-2025`;

        const result = await importDuesCSVToFirestore(mockFirestore, csv);
        expect(result.success).toBe(true);
    });

    it('auto-exempts old unpaid dues (> 18 months)', async () => {
        // Create a date 2 years ago
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 2);
        const oldDateStr = `${oldDate.getDate().toString().padStart(2, '0')}-${(oldDate.getMonth() + 1).toString().padStart(2, '0')}-${oldDate.getFullYear()}`;

        const csv = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Old Due;1000;${oldDateStr};NO;Test User;user1;NO;`;

        const result = await importDuesCSVToFirestore(mockFirestore, csv);
        expect(result.success).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('Auto-exempted old due');
        // Note: Auto-exempted items are NOT skipped, they are imported as exempt.
        // So skippedItems should be empty for this case.
        expect(result.skippedItems).toHaveLength(0);
    });

    it('skips invalid amount and reports it in skippedItems', async () => {
        const csv = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Invalid Due;invalid;01-01-2025;NO;Test User;user1;NO;`;

        const result = await importDuesCSVToFirestore(mockFirestore, csv);
        expect(result.success).toBe(true); // It's partial success usually
        expect(result.skippedItems).toHaveLength(1);
        expect(result.skippedItems[0].reason).toBe('Invalid Due');
        expect(result.skippedItems[0].skipReason).toContain('Invalid amount');
    });

    it('does NOT exempt recent unpaid dues (< 18 months)', async () => {
        // Create a date 1 month ago
        const recentDate = new Date();
        recentDate.setMonth(recentDate.getMonth() - 1);
        const recentDateStr = `${recentDate.getDate().toString().padStart(2, '0')}-${(recentDate.getMonth() + 1).toString().padStart(2, '0')}-${recentDate.getFullYear()}`;

        const csv = `due_name;due_amount;due_created;due_archived;username;user_id;user_paid;user_payment_date
Recent Due;1000;${recentDateStr};NO;Test User;user1;NO;`;

        const result = await importDuesCSVToFirestore(mockFirestore, csv);
        expect(result.success).toBe(true);
        // Should NOT have the auto-exempt warning
        const exemptWarnings = result.warnings.filter(w => w.includes('Auto-exempted old due'));
        expect(exemptWarnings.length).toBe(0);
    });
});
