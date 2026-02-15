import { describe, it, expect } from 'vitest';
import { parsePunishmentCSV } from '@/lib/csv-parse-punishments';

function buildCSV(rows: string[]): string {
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
  ].join(';');
  return [header, ...rows].join('\n');
}

function buildRow(overrides: Partial<Record<string, string>> = {}): string {
  const defaults: Record<string, string> = {
    team_id: 'team-1',
    team_name: 'My Team',
    penatly_created: '01-05-2025',
    penatly_user: 'Test User',
    penatly_reason: 'Zu spät',
    penatly_archived: 'NO',
    penatly_paid: '',
    penatly_amount: '1000',
    penatly_currency: 'EUR',
    penatly_subject: '',
  };
  const merged = { ...defaults, ...overrides };
  return Object.values(merged).join(';');
}

describe('parsePunishmentCSV', () => {
  describe('classification', () => {
    it('classifies a normal reason as FINE', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Zu spät zum Training' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].type).toBe('FINE');
      expect(result.rows[0].reason).toBe('Zu spät zum Training');
    });

    it('classifies a drink reason as DRINK', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Bier' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].type).toBe('DRINK');
      expect(result.rows[0].beverageCategory).toBe('Beer/Lemonade');
    });

    it('classifies Guthaben as PAYMENT', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Guthaben' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].type).toBe('PAYMENT');
    });

    it('classifies "Guthaben Rest" as PAYMENT', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Guthaben Rest' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].type).toBe('PAYMENT');
    });

    it('classifies Einzahlung as PAYMENT', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Einzahlung' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].type).toBe('PAYMENT');
    });

    it('uses penatly_subject for classification when available', () => {
      const csv = buildCSV([buildRow({
        penatly_reason: 'Something ambiguous',
        penatly_subject: 'Getränk',
      })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].type).toBe('DRINK');
    });

    it('classifies "Kasten Bier" as FINE (excluded keyword)', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Kasten Bier' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].type).toBe('FINE');
    });
  });

  describe('amount conversion', () => {
    it('converts cents to EUR', () => {
      const csv = buildCSV([buildRow({ penatly_amount: '2500' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows[0].amount).toBe(25);
    });

    it('skips zero-amount rows', () => {
      const csv = buildCSV([buildRow({ penatly_amount: '0' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(0);
      expect(result.warnings.some(w => w.includes('zero-amount'))).toBe(true);
    });

    it('skips NaN amounts', () => {
      const csv = buildCSV([buildRow({ penatly_amount: 'abc' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(0);
      expect(result.warnings.some(w => w.includes('Invalid amount'))).toBe(true);
    });
  });

  describe('paid status parsing', () => {
    it('parses empty paid field as unpaid', () => {
      const csv = buildCSV([buildRow({ penatly_paid: '' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows[0].paid).toBe(false);
      expect(result.rows[0].paidAt).toBeNull();
    });

    it('parses STATUS_PAID as paid', () => {
      const csv = buildCSV([buildRow({ penatly_paid: 'STATUS_PAID' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows[0].paid).toBe(true);
    });

    it('parses a date string as paid with paidAt', () => {
      const csv = buildCSV([buildRow({ penatly_paid: '15-06-2025' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows[0].paid).toBe(true);
      expect(result.rows[0].paidAt).toContain('2025');
    });

    it('parses "yes" as paid', () => {
      const csv = buildCSV([buildRow({ penatly_paid: 'yes' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows[0].paid).toBe(true);
    });

    it('parses "no" as unpaid', () => {
      const csv = buildCSV([buildRow({ penatly_paid: 'no' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows[0].paid).toBe(false);
    });
  });

  describe('date parsing', () => {
    it('parses DD-MM-YYYY format', () => {
      const csv = buildCSV([buildRow({ penatly_created: '15-03-2025' })]);
      const result = parsePunishmentCSV(csv);

      const date = new Date(result.rows[0].date);
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(2); // March = 2 (0-indexed)
      expect(date.getUTCDate()).toBe(15);
    });
  });

  describe('validation and skipping', () => {
    it('skips rows with missing required fields', () => {
      const csv = buildCSV([buildRow({ penatly_user: '' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(0);
      expect(result.warnings.some(w => w.includes('Missing required'))).toBe(true);
    });

    it('skips rows with "Unknown" player name', () => {
      const csv = buildCSV([buildRow({ penatly_user: 'Unknown' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(0);
      expect(result.warnings.some(w => w.includes('unknown player'))).toBe(true);
    });

    it('trims player names', () => {
      const csv = buildCSV([buildRow({ penatly_user: '  Max Mustermann  ' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows[0].playerName).toBe('Max Mustermann');
    });

    it('trims reason', () => {
      const csv = buildCSV([buildRow({ penatly_reason: '  Gelbe Karte  ' })]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows[0].reason).toBe('Gelbe Karte');
    });
  });

  describe('BOM handling', () => {
    it('strips UTF-8 BOM from input', () => {
      const csv = '\uFEFF' + buildCSV([buildRow()]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('multiple rows', () => {
    it('processes multiple rows correctly', () => {
      const csv = buildCSV([
        buildRow({ penatly_reason: 'Gelbe Karte', penatly_amount: '500' }),
        buildRow({ penatly_reason: 'Bier', penatly_amount: '150' }),
        buildRow({ penatly_reason: 'Guthaben', penatly_amount: '2000' }),
      ]);
      const result = parsePunishmentCSV(csv);

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].type).toBe('FINE');
      expect(result.rows[1].type).toBe('DRINK');
      expect(result.rows[2].type).toBe('PAYMENT');
      expect(result.totalRowsProcessed).toBe(3);
    });
  });

  describe('beverage category mapping', () => {
    it('maps Bier to Beer/Lemonade', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Bier' })]);
      const result = parsePunishmentCSV(csv);
      expect(result.rows[0].beverageCategory).toBe('Beer/Lemonade');
    });

    it('maps Apfelwein to Appler', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Apfelwein' })]);
      const result = parsePunishmentCSV(csv);
      expect(result.rows[0].beverageCategory).toBe('Appler');
    });

    it('maps unknown drink to Beverages', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Mystery Drink' })]);
      const result = parsePunishmentCSV(csv);
      expect(result.rows[0].beverageCategory).toBe('Beverages');
    });

    it('does not set beverageCategory for FINE type', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Zu spät' })]);
      const result = parsePunishmentCSV(csv);
      expect(result.rows[0].beverageCategory).toBeUndefined();
    });

    it('does not set beverageCategory for PAYMENT type', () => {
      const csv = buildCSV([buildRow({ penatly_reason: 'Guthaben' })]);
      const result = parsePunishmentCSV(csv);
      expect(result.rows[0].beverageCategory).toBeUndefined();
    });
  });
});
