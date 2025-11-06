import { describe, it, expect, beforeEach } from 'vitest';
import { importPunishmentsCSV } from '@/lib/csv-import';
import { payments } from '@/lib/static-data';

// Helper to build a minimal punishments CSV line
function buildPunishmentsCSVRow(
  {
    created = '01-05-2025',
    user = 'Test User',
    reason = 'Guthaben',
    paid = 'STATUS_PAID',
    amount = '1000', // cents
    currency = 'EUR',
    subject = 'Einzahlung: Test User',
  }: Partial<Record<'created'|'user'|'reason'|'paid'|'amount'|'currency'|'subject', string>> = {}
) {
  return [
    'team-1',
    'My Team',
    created,
    user,
    reason,
    'NO',
    paid,
    amount,
    currency,
    subject,
    ''
  ].join(';');
}

describe('importPunishmentsCSV Guthaben handling', () => {
  let paymentsLenBefore = 0;

  beforeEach(() => {
    paymentsLenBefore = payments.length;
  });

  it('creates a Payment for Guthaben entries from punishments CSV', async () => {
    const header = [
      'team_id',
      'team_name',
      'penatly_created',
      'penatly_user',
      'penatly_reason',
      'penatly_archived',
      'penatly_paid',
      'penatly_amount',
      'penatly_currency',
      'penatly_subject',
      'search_params',
    ].join(';');

    const row = buildPunishmentsCSVRow({ reason: 'Guthaben', amount: '2500' }); // 25.00 EUR
    const csv = `${header}\n${row}`;

    const result = await importPunishmentsCSV(csv);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    // One record should be created (the Payment)
    expect(result.recordsCreated).toBe(1);

    // Payments array should have grown by 1
    expect(payments.length).toBe(paymentsLenBefore + 1);

    const created = payments[payments.length - 1];
    expect(created.reason.toLowerCase()).toBe('guthaben');
    expect(created.amount).toBe(25);
    expect(created.paid).toBe(true);
  });

  it('creates a Payment for "Guthaben Rest" entries from punishments CSV', async () => {
    const header = [
      'team_id',
      'team_name',
      'penatly_created',
      'penatly_user',
      'penatly_reason',
      'penatly_archived',
      'penatly_paid',
      'penatly_amount',
      'penatly_currency',
      'penatly_subject',
      'search_params',
    ].join(';');

    const row = buildPunishmentsCSVRow({ reason: 'Guthaben Rest', amount: '750' }); // 7.50 EUR
    const csv = `${header}\n${row}`;

    const result = await importPunishmentsCSV(csv);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    // One record should be created (the Payment)
    expect(result.recordsCreated).toBe(1);

    // Payments array should have grown by 1 (each test runs with accumulated static-data)
    expect(payments.length).toBe(paymentsLenBefore + 1);

    const created = payments[payments.length - 1];
    expect(created.reason.toLowerCase()).toBe('guthaben rest');
    expect(created.amount).toBe(7.5);
    expect(created.paid).toBe(true);
  });
});
