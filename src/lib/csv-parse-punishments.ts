/**
 * Pure punishment CSV parsing logic.
 *
 * Shared between the static-data importer (csv-import.ts) and the
 * Firestore importer (csv-import-firestore.ts). This module only
 * parses and classifies rows — it has NO side effects and does NOT
 * write to Firestore or static arrays.
 */

import * as Papa from 'papaparse';
import { classifyPunishmentWithSubject, mapBeverageCategory } from './csv-utils';

export type PunishmentRowType = 'FINE' | 'DRINK' | 'PAYMENT';

export interface ParsedPunishmentRow {
  rowIndex: number;
  type: PunishmentRowType;
  playerName: string;
  reason: string;
  amount: number;          // EUR (already converted from cents)
  date: string;            // ISO string
  paid: boolean;
  paidAt: string | null;
  beverageCategory?: string; // Only set when type === 'DRINK'
}

export interface PunishmentParseResult {
  rows: ParsedPunishmentRow[];
  warnings: string[];
  errors: string[];
  totalRowsProcessed: number;
}

// --- internal helpers (no exports, no side effects) ---

function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1);
  }
  return text;
}

function parseGermanDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') {
    return new Date().toISOString();
  }

  const raw = dateStr.trim();
  const parts = raw.split('-');
  if (parts.length !== 3) return new Date().toISOString();

  let day: number, month: number, year: number;
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));
  return date.toISOString();
}

function centsToEUR(cents: string | number): number {
  const amount = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  return amount / 100;
}

function parsePaidStatus(raw: any): { paid: boolean; paidAt: string | null } {
  const v = (raw ?? '').toString().trim();
  if (!v) return { paid: false, paidAt: null };
  const lower = v.toLowerCase();
  if (['yes', 'y', 'true', 'paid', 'status_paid', 'status-paid'].includes(lower)) {
    return { paid: true, paidAt: null };
  }
  if (['no', 'n', 'false', 'unpaid', 'status_unpaid', 'status-unpaid'].includes(lower)) {
    return { paid: false, paidAt: null };
  }
  if (v.includes('-')) {
    try {
      return { paid: true, paidAt: parseGermanDate(v) };
    } catch {
      // fall through
    }
  }
  return { paid: false, paidAt: null };
}

function isInvalidPlayerName(name?: string | null): boolean {
  const normalized = (name ?? '').trim().toLowerCase();
  if (!normalized) return true;
  return normalized === 'unknown' || normalized === 'player unknown';
}

function isGuthabenReason(reason: string): boolean {
  const lower = reason.trim().toLowerCase();
  return (
    lower === 'guthaben' ||
    lower === 'guthaben rest' ||
    lower.includes('guthaben rest') ||
    lower.includes('guthaben') ||
    lower.startsWith('einzahlung')
  );
}

// --- main exported function ---

/**
 * Parses a punishment CSV text and returns classified rows.
 *
 * This is a pure function with no side effects. It:
 * 1. Strips BOM and parses CSV (semicolon-delimited, header mode)
 * 2. Validates required fields per row
 * 3. Converts amounts from cents to EUR
 * 4. Parses dates and paid status
 * 5. Classifies each row as FINE, DRINK, or PAYMENT
 * 6. Maps drink reasons to standardized beverage categories
 *
 * Callers are responsible for player lookup/creation and data storage.
 */
export function parsePunishmentCSV(text: string): PunishmentParseResult {
  const result: PunishmentParseResult = {
    rows: [],
    warnings: [],
    errors: [],
    totalRowsProcessed: 0,
  };

  try {
    const cleanText = stripBOM(text);
    const parsed = Papa.parse(cleanText, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^"/, '').replace(/"$/, ''),
    });

    if (parsed.errors.length > 0) {
      result.errors.push(...parsed.errors.map(e => `CSV Parse Error: ${e.message}`));
    }

    const rows = parsed.data as any[];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        result.totalRowsProcessed++;

        // Validate required fields
        if (!row.penatly_user || !row.penatly_reason || !row.penatly_amount) {
          result.warnings.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Parse dates and paid status
        const createdDate = parseGermanDate(row.penatly_created);
        const { paid: isPaidFlag, paidAt: parsedPaidAt } = parsePaidStatus(row.penatly_paid);

        // Convert amount from cents to EUR
        const amountEUR = centsToEUR(row.penatly_amount);

        if (isNaN(amountEUR)) {
          result.warnings.push(`Row ${i + 1}: Invalid amount: ${row.penatly_amount}`);
          continue;
        }

        if (amountEUR === 0) {
          result.warnings.push(`Row ${i + 1}: Skipped zero-amount penalty`);
          continue;
        }

        // Skip invalid player names
        if (isInvalidPlayerName(row.penatly_user)) {
          result.warnings.push(`Row ${i + 1}: Skipped due to missing or unknown player name`);
          continue;
        }

        const playerName = row.penatly_user.trim();
        const reason = row.penatly_reason.trim();

        // Classify: Guthaben → PAYMENT, Drink → DRINK, else → FINE
        if (isGuthabenReason(reason)) {
          result.rows.push({
            rowIndex: i,
            type: 'PAYMENT',
            playerName,
            reason,
            amount: amountEUR,
            date: createdDate,
            paid: isPaidFlag,
            paidAt: parsedPaidAt,
          });
          continue;
        }

        const classification = classifyPunishmentWithSubject(reason, row.penatly_subject);

        if (classification === 'DRINK') {
          result.rows.push({
            rowIndex: i,
            type: 'DRINK',
            playerName,
            reason,
            amount: amountEUR,
            date: createdDate,
            paid: isPaidFlag,
            paidAt: parsedPaidAt,
            beverageCategory: mapBeverageCategory(reason),
          });
        } else {
          result.rows.push({
            rowIndex: i,
            type: 'FINE',
            playerName,
            reason,
            amount: amountEUR,
            date: createdDate,
            paid: isPaidFlag,
            paidAt: parsedPaidAt,
          });
        }
      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}
