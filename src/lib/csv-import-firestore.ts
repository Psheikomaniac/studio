/**
 * CSV Import with Firestore Integration
 *
 * This module imports CSV data directly into Firestore using the service classes.
 * Unlike csv-import.ts which writes to local arrays, this writes to the database.
 */

'use client';

import * as Papa from 'papaparse';
import {
  collection,
  writeBatch,
  doc,
  getDocs,
  query,
  where,
  Firestore,
} from 'firebase/firestore';
import { Player, Fine, Payment, Due, DuePayment, Beverage, PaymentCategory } from './types';
import { parsePunishmentCSV } from './csv-parse-punishments';

export interface SkippedItem {
  date: string;
  user: string;
  reason: string;
  amount: number;
  paid: boolean;
  skipReason: string;
  type: 'fine' | 'payment' | 'due' | 'transaction';
}

export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  playersCreated: number;
  recordsCreated: number;
  errors: string[];
  warnings: string[];
  skippedItems: SkippedItem[];
  duplicatesSkipped: number;
}

// Helper function to strip BOM (Byte Order Mark) if present
function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1);
  }
  return text;
}

// Helper function to generate unique ID
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Deterministic document ID from content parts (djb2 hash).
// Same inputs always produce the same 8-char hex ID, enabling idempotent imports:
// re-importing an existing row calls batch.set on the same document → no duplicate created.
function deterministicId(parts: string[]): string {
  const key = parts.map(p => (p ?? '').toString().toLowerCase().trim()).join('|');
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
    hash = hash >>> 0; // keep as unsigned 32-bit
  }
  return hash.toString(16).padStart(8, '0');
}

// Helper function to parse date strings to ISO (supports DD-MM-YYYY and YYYY-MM-DD)
function parseGermanDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const raw = dateStr.trim();
  if (raw === '') return new Date().toISOString();

  const parts = raw.split('-');
  if (parts.length !== 3) return new Date().toISOString();

  let day: number, month: number, year: number;
  // Detect format by which part has 4 digits
  if (parts[0].length === 4) {
    // YYYY-MM-DD
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (parts[2].length === 4) {
    // DD-MM-YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // Fallback: assume DD-MM-YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  // Create date at noon UTC to avoid timezone issues
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));
  return date.toISOString();
}

// Helper function to convert cents to EUR
function centsToEUR(cents: string | number): number {
  const amount = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  return amount / 100;
}

// Helper to interpret paid field that might be a status or a date
function parsePaidStatus(raw: any): { paid: boolean; paidAt: string | null } {
  const v = (raw ?? '').toString().trim();
  if (!v) return { paid: false, paidAt: null };
  const lower = v.toLowerCase();
  // Common status markers
  if (['yes', 'y', 'true', 'paid', 'status_paid', 'status-paid'].includes(lower)) {
    return { paid: true, paidAt: null };
  }
  if (['no', 'n', 'false', 'unpaid', 'status_unpaid', 'status-unpaid'].includes(lower)) {
    return { paid: false, paidAt: null };
  }
  // Heuristic: looks like a date if it contains '-'
  if (v.includes('-')) {
    try {
      const iso = parseGermanDate(v);
      return { paid: true, paidAt: iso };
    } catch {
      // fall through
    }
  }
  // Fallback: unknown content -> treat as unpaid
  return { paid: false, paidAt: null };
}

// Remove undefined fields and internal props before writing to Firestore
function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('__')) continue;
    if (value === undefined) continue;
    sanitized[key] = value as any;
  }
  return sanitized as T;
}

// Helper to validate player names; skip rows with missing or 'Unknown' player names
function isInvalidPlayerName(name?: string | null): boolean {
  const normalized = (name ?? '').trim().toLowerCase();
  if (!normalized) return true;
  return normalized === 'unknown' || normalized === 'player unknown';
}

/**
 * Find or create player in Firestore
 */
async function findOrCreatePlayer(
  firestore: Firestore,
  teamId: string,
  name: string,
  id?: string,
  existingPlayers?: Map<string, Player>
): Promise<Player> {
  const normalizedName = name.trim().toLowerCase();

  // First check in-memory cache
  if (existingPlayers?.has(normalizedName)) {
    return existingPlayers.get(normalizedName)!;
  }

  // Check Firestore in team players collection
  const playersRef = collection(firestore, `teams/${teamId}/players`);

  // Check by ID if provided
  if (id) {
    const docSnap = await getDocs(query(playersRef, where('__name__', '==', id)));
    if (!docSnap.empty) {
      const player = { id, ...docSnap.docs[0].data() } as Player;
      (player as any).__isNew = false;
      existingPlayers?.set(normalizedName, player);
      return player;
    }
  }

  // Check by name
  const snapshot = await getDocs(query(playersRef));

  for (const doc of snapshot.docs) {
    const player = { id: doc.id, ...doc.data() } as Player;
    if ((player.name || '').toLowerCase().trim() === normalizedName) {
      (player as any).__isNew = false;
      existingPlayers?.set(normalizedName, player);
      return player;
    }
  }

  // Create new player (not yet written to Firestore)
  const newPlayer: Player = {
    id: id || generateId('player'),
    name: name.trim(),
    nickname: name.trim().split(' ')[0],
    photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=0ea5e9&color=fff`,
    balance: 0,
    teamId,
  };
  (newPlayer as any).__isNew = true;

  existingPlayers?.set(normalizedName, newPlayer);
  return newPlayer;
}

/**
 * Find or create beverage in Firestore
 */
async function findOrCreateBeverage(
  firestore: Firestore,
  name: string,
  price: number,
  existingBeverages?: Map<string, Beverage>
): Promise<Beverage> {
  const normalizedName = name.trim().toLowerCase();

  // Check in-memory cache
  if (existingBeverages?.has(normalizedName)) {
    return existingBeverages.get(normalizedName)!;
  }

  // Check Firestore
  const beveragesRef = collection(firestore, 'beverages');
  const snapshot = await getDocs(beveragesRef);

  for (const doc of snapshot.docs) {
    const beverage = { id: doc.id, ...doc.data() } as Beverage;
    if ((beverage.name || '').toLowerCase().trim() === normalizedName) {
      (beverage as any).__isNew = false;
      existingBeverages?.set(normalizedName, beverage);
      return beverage;
    }
  }

  // Create new beverage (not yet written to Firestore)
  const newBeverage: Beverage = {
    id: generateId('bev'),
    name: name.trim(),
    price: price
  };
  (newBeverage as any).__isNew = true;

  existingBeverages?.set(normalizedName, newBeverage);
  return newBeverage;
}

/**
 * Import Dues CSV into Firestore
 */
export async function importDuesCSVToFirestore(
  firestore: Firestore,
  teamId: string,
  text: string,
  onProgress?: (progress: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    rowsProcessed: 0,
    playersCreated: 0,
    recordsCreated: 0,
    errors: [],
    warnings: [],
    skippedItems: [],
    duplicatesSkipped: 0,
  };

  try {
    // Strip BOM and parse CSV
    const cleanText = stripBOM(text);
    const parsed = Papa.parse(cleanText, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^"/, '').replace(/"$/, '')
    });

    if (parsed.errors.length > 0) {
      result.errors.push(...parsed.errors.map(e => `CSV Parse Error: ${e.message}`));
    }

    const rows = parsed.data as any[];
    const duesMap = new Map<string, Due>();
    const existingPlayers = new Map<string, Player>();
    const seenFingerprints = new Set<string>();
    const playersToCreate: Player[] = [];
    const duePaymentsToCreate: DuePayment[] = [];

    // Process all rows first
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        result.rowsProcessed++;

        if (onProgress) {
          onProgress(i + 1, rows.length);
        }

        // Validate required fields
        if (!row.due_name || !row.due_amount || !row.username) {
          result.warnings.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Parse dates
        const dueCreated = parseGermanDate(row.due_created);
        const paymentDate = row.user_payment_date ? parseGermanDate(row.user_payment_date) : undefined;

        // Convert amount from cents to EUR
        const amountEUR = centsToEUR(row.due_amount);

        // Validate amount
        if (isNaN(amountEUR) || amountEUR < 0) {
          result.warnings.push(`Row ${i + 1}: Invalid amount: ${row.due_amount}`);
          result.skippedItems.push({
            date: dueCreated,
            user: row.username || 'Unknown',
            reason: row.due_name || 'Unknown Due',
            amount: isNaN(amountEUR) ? 0 : amountEUR,
            paid: false,
            skipReason: `Invalid amount: ${row.due_amount}`,
            type: 'due'
          });
          continue;
        }

        // Find or create Due record
        const dueName = row.due_name.trim();
        let due = duesMap.get(dueName);

        if (!due) {
          due = {
            id: deterministicId(['due', dueName]),
            name: dueName,
            amount: amountEUR,
            createdAt: dueCreated,
            active: row.due_archived !== 'YES',
            archived: row.due_archived === 'YES'
          };
          duesMap.set(dueName, due);
        }

        // Skip invalid or unknown player names
        if (isInvalidPlayerName(row.username)) {
          result.warnings.push(`Row ${i + 1}: Skipped due to missing or unknown player name`);
          result.skippedItems.push({
            date: dueCreated,
            user: row.username || 'Unknown',
            reason: dueName,
            amount: amountEUR,
            paid: false,
            skipReason: 'Missing or unknown player name',
            type: 'due'
          });
          continue;
        }

        // Find or create player
        const player = await findOrCreatePlayer(firestore, teamId, row.username, row.user_id, existingPlayers);

        // Track if player is new (based on __isNew flag set by finder)
        if ((player as any).__isNew && !playersToCreate.some(p => p.id === player.id)) {
          playersToCreate.push(player);
          result.playersCreated++;
        }

        // Intra-CSV deduplication: same player+due+date → skip
        const dpFingerprint = deterministicId([teamId, player.id, due.id, dueCreated.substring(0, 10)]);
        if (seenFingerprints.has(dpFingerprint)) {
          result.duplicatesSkipped++;
          result.warnings.push(`Row ${i + 1}: Intra-CSV duplicate skipped: ${row.username} / ${dueName}`);
          continue;
        }
        seenFingerprints.add(dpFingerprint);

        // Determine payment status
        // Use the helper to parse status properly (handles "Paid", "yes", dates, etc.)
        const { paid: isPaid, paidAt: parsedPaidAt } = parsePaidStatus(row.user_paid);
        let isExempt = row.user_paid === 'STATUS_EXEMPT';

        // Historical dues are imported as-is with their original paid/exempt status.
        // The isArchivedDue flag is informational only — do not auto-exempt based on age.
        const isArchivedDue = !!due.archived;

        // Create DuePayment record with deterministic ID (idempotent across re-imports)
        const duePayment: DuePayment = {
          id: dpFingerprint,
          dueId: due.id,
          userId: player.id,
          teamId,
          userName: player.name,
          amountDue: amountEUR,
          paid: isPaid,
          paidAt: isPaid ? (parsedPaidAt || (paymentDate ? paymentDate : null)) : null,
          exempt: isExempt,
          createdAt: dueCreated
        };

        duePaymentsToCreate.push(duePayment);
        result.recordsCreated++;

      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Now write to Firestore in batches
    const BATCH_SIZE = 500; // Firestore batch limit

    // Write players
    for (let i = 0; i < playersToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPlayers = playersToCreate.slice(i, i + BATCH_SIZE);

      for (const player of batchPlayers) {
        const playerRef = doc(firestore, `teams/${teamId}/players`, player.id);
        batch.set(playerRef, sanitizeFirestoreData(player as any));
      }

      await batch.commit();
    }

    // Write dues
    const duesArray = Array.from(duesMap.values());
    for (let i = 0; i < duesArray.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchDues = duesArray.slice(i, i + BATCH_SIZE);

      for (const due of batchDues) {
        const dueRef = doc(firestore, 'dues', due.id);
        batch.set(dueRef, sanitizeFirestoreData(due as any));
      }

      await batch.commit();
    }

    // Write due payments (in team/player subcollections)
    for (let i = 0; i < duePaymentsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPayments = duePaymentsToCreate.slice(i, i + BATCH_SIZE);

      for (const payment of batchPayments) {
        const paymentRef = doc(firestore, `teams/${teamId}/players/${payment.userId}/duePayments`, payment.id);
        batch.set(paymentRef, sanitizeFirestoreData({ ...payment, teamId } as any));
      }

      await batch.commit();
    }

    result.success = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.success = false;
  }

  return result;
}

/**
 * Import Punishments CSV into Firestore.
 * Uses shared parsePunishmentCSV() for parsing and classification,
 * then handles player/beverage lookup and Firestore batch writes.
 */
export async function importPunishmentsCSVToFirestore(
  firestore: Firestore,
  teamId: string,
  text: string,
  onProgress?: (progress: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    rowsProcessed: 0,
    playersCreated: 0,
    recordsCreated: 0,
    errors: [],
    warnings: [],
    skippedItems: [],
    duplicatesSkipped: 0,
  };

  try {
    // Use shared parser for CSV parsing and classification
    const parsed = parsePunishmentCSV(text);
    result.rowsProcessed = parsed.totalRowsProcessed;
    result.duplicatesSkipped = parsed.duplicatesSkipped;
    result.errors.push(...parsed.errors);
    result.warnings.push(...parsed.warnings);

    const existingPlayers = new Map<string, Player>();
    const existingBeverages = new Map<string, Beverage>();
    const playersToCreate: Player[] = [];
    const beveragesToCreate: Beverage[] = [];
    const finesToCreate: { userId: string; fine: Fine }[] = [];
    const paymentsToCreate: { userId: string; payment: Payment }[] = [];

    // Process parsed rows — only player/beverage lookup and record creation
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];

      if (onProgress) {
        onProgress(i + 1, parsed.rows.length);
      }

      // Find or create player
      const player = await findOrCreatePlayer(firestore, teamId, row.playerName, undefined, existingPlayers);

      if ((player as any).__isNew && !playersToCreate.some(p => p.id === player.id)) {
        playersToCreate.push(player);
        result.playersCreated++;
      }

      if (row.type === 'PAYMENT') {
        const payment: Payment = {
          id: deterministicId([teamId, player.id, row.date.substring(0, 10), row.reason, String(row.amount)]),
          userId: player.id,
          teamId,
          category: PaymentCategory.PAYMENT,
          reason: row.reason,
          amount: row.amount,
          date: row.date,
          paid: row.paid,
          paidAt: row.paidAt
        };
        paymentsToCreate.push({ userId: player.id, payment });
        result.recordsCreated++;

      } else if (row.type === 'DRINK') {
        // Use the actual drink name (row.reason) not the generic category label
        const beverageName = row.reason || row.beverageCategory!;
        const beverage = await findOrCreateBeverage(
          firestore, beverageName, row.amount, existingBeverages
        );

        if ((beverage as any).__isNew && !beveragesToCreate.some(b => b.id === beverage.id)) {
          beveragesToCreate.push(beverage);
        }

        // Create beverage fine with deterministic ID (idempotent across re-imports)
        const fine: Fine = {
          id: deterministicId([teamId, player.id, row.date.substring(0, 10), row.reason, String(row.amount)]),
          userId: player.id,
          teamId,
          reason: beverage.name,
          amount: row.amount,
          date: row.date,
          paid: row.paid,
          paidAt: row.paidAt,
          fineType: 'beverage',
          beverageId: beverage.id,
          createdAt: row.date,
          updatedAt: row.paidAt || row.date
        };
        finesToCreate.push({ userId: player.id, fine });
        result.recordsCreated++;

      } else {
        const fine: Fine = {
          id: deterministicId([teamId, player.id, row.date.substring(0, 10), row.reason, String(row.amount)]),
          userId: player.id,
          teamId,
          reason: row.reason,
          amount: row.amount,
          date: row.date,
          paid: row.paid,
          paidAt: row.paidAt,
          createdAt: row.date,
          updatedAt: row.paidAt || row.date
        };
        finesToCreate.push({ userId: player.id, fine });
        result.recordsCreated++;
      }
    }

    // Write to Firestore in batches
    const BATCH_SIZE = 500;

    // Write players (to team subcollection)
    for (let i = 0; i < playersToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPlayers = playersToCreate.slice(i, i + BATCH_SIZE);

      for (const player of batchPlayers) {
        const playerRef = doc(firestore, `teams/${teamId}/players`, player.id);
        batch.set(playerRef, sanitizeFirestoreData(player as any));
      }

      await batch.commit();
    }

    // Write beverages
    for (let i = 0; i < beveragesToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchBeverages = beveragesToCreate.slice(i, i + BATCH_SIZE);

      for (const beverage of batchBeverages) {
        const beverageRef = doc(firestore, 'beverages', beverage.id);
        batch.set(beverageRef, sanitizeFirestoreData(beverage as any));
      }

      await batch.commit();
    }

    // Write payments (in team/player subcollections)
    for (let i = 0; i < paymentsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPayments = paymentsToCreate.slice(i, i + BATCH_SIZE);

      for (const { userId, payment } of batchPayments) {
        const paymentRef = doc(firestore, `teams/${teamId}/players/${userId}/payments`, payment.id);
        batch.set(paymentRef, sanitizeFirestoreData({ ...payment, teamId } as any));
      }

      await batch.commit();
    }

    // Write fines (in team/player subcollections)
    for (let i = 0; i < finesToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchFines = finesToCreate.slice(i, i + BATCH_SIZE);

      for (const { userId, fine } of batchFines) {
        const fineRef = doc(firestore, `teams/${teamId}/players/${userId}/fines`, fine.id);
        batch.set(fineRef, sanitizeFirestoreData({ ...fine, teamId } as any));
      }

      await batch.commit();
    }

    result.success = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.success = false;
  }

  return result;
}

/**
 * Import Transactions CSV into Firestore
 */
export async function importTransactionsCSVToFirestore(
  firestore: Firestore,
  teamId: string,
  text: string,
  onProgress?: (progress: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    rowsProcessed: 0,
    playersCreated: 0,
    recordsCreated: 0,
    errors: [],
    warnings: [],
    skippedItems: [],
    duplicatesSkipped: 0,
  };

  try {
    // Strip BOM and parse CSV
    const cleanText = stripBOM(text);
    const parsed = Papa.parse(cleanText, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^"/, '').replace(/"$/, '')
    });

    if (parsed.errors.length > 0) {
      result.errors.push(...parsed.errors.map(e => `CSV Parse Error: ${e.message}`));
    }

    const rows = parsed.data as any[];
    const existingPlayers = new Map<string, Player>();
    const seenFingerprints = new Set<string>();
    const playersToCreate: Player[] = [];
    const paymentsToCreate: { userId: string; payment: Payment }[] = [];

    // Process all rows first
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        result.rowsProcessed++;

        if (onProgress) {
          onProgress(i + 1, rows.length);
        }

        // Validate required fields
        if (!row.transaction_date || !row.transaction_amount || !row.transaction_subject) {
          result.warnings.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Parse date
        const transactionDate = parseGermanDate(row.transaction_date);

        // Convert amount from cents to EUR
        const amountEUR = centsToEUR(row.transaction_amount);

        // Validate amount
        if (isNaN(amountEUR)) {
          result.warnings.push(`Row ${i + 1}: Invalid amount: ${row.transaction_amount}`);
          continue;
        }

        // Parse transaction subject to extract player name and category
        const subject = row.transaction_subject.trim();
        let playerName = '';
        let category = '';

        // Skip Beiträge (membership dues) — handled exclusively by the Dues CSV importer.
        // Creating a Payment here would double-count credits already recorded as DuePayments.
        const subjectPrefix = subject.split(':')[0].trim().toLowerCase();
        if (subjectPrefix.includes('beitr')) { // matches "beitrag", "beiträge"
          result.warnings.push(`Row ${i + 1}: Skipped Beiträge transaction (handled via dues CSV): ${subject}`);
          result.skippedItems.push({
            date: transactionDate,
            user: 'Unknown (Subject Parse)',
            reason: subject,
            amount: amountEUR,
            paid: true,
            skipReason: 'Beiträge handled via Dues CSV',
            type: 'transaction'
          });
          continue;
        }

        // Only attempt standard parsing if we haven't found a player name yet
        if (!playerName) {
          const colonIndex = subject.indexOf(':');
          if (colonIndex > -1) {
            const afterColon = subject.substring(colonIndex + 1).trim();

            const parenIndex = afterColon.indexOf('(');
            if (parenIndex > -1) {
              playerName = afterColon.substring(0, parenIndex).trim();
              const closeParen = afterColon.indexOf(')');
              if (closeParen > parenIndex) {
                category = afterColon.substring(parenIndex + 1, closeParen).trim();
              }
            } else {
              playerName = afterColon;
            }
          } else {
            result.warnings.push(`Row ${i + 1}: Could not parse player name from subject: ${subject}`);
            continue;
          }
        }

        if (!playerName) {
          result.warnings.push(`Row ${i + 1}: Could not extract player name from subject: ${subject}`);
          continue;
        }

        // Skip ALL Strafen transactions — both fine settlements and Guthaben credits.
        // Guthaben is the authoritative source in the Punishments CSV (as a PAYMENT row).
        // The Transactions CSV records it again with a different date → would double-count.
        if (subjectPrefix.includes('straf')) {
          const categoryLower = (category || '').trim().toLowerCase();
          const isGuthabenCategory = categoryLower === 'guthaben' || categoryLower === 'guthaben rest';
          const skipReason = isGuthabenCategory
            ? 'Guthaben aus Punishments-CSV importiert'
            : 'Strafen settlement handled via punishments CSV';
          result.warnings.push(`Row ${i + 1}: Skipped Strafen transaction (${skipReason}): ${subject}`);
          result.skippedItems.push({
            date: transactionDate,
            user: playerName,
            reason: subject,
            amount: amountEUR,
            paid: true,
            skipReason,
            type: 'transaction'
          });
          continue;
        }

        // Skip invalid or unknown player names derived from subject
        if (isInvalidPlayerName(playerName)) {
          result.warnings.push(`Row ${i + 1}: Skipped due to missing or unknown player name in subject`);
          result.skippedItems.push({
            date: transactionDate,
            user: playerName || 'Unknown',
            reason: subject,
            amount: amountEUR,
            paid: true,
            skipReason: 'Missing or unknown player name in subject',
            type: 'transaction'
          });
          continue;
        }

        // Find or create player
        const player = await findOrCreatePlayer(firestore, teamId, playerName, undefined, existingPlayers);

        if ((player as any).__isNew && !playersToCreate.some(p => p.id === player.id)) {
          playersToCreate.push(player);
          result.playersCreated++;
        }

        // Determine if this is a storno
        const isStorno = amountEUR < 0;
        if (isStorno) {
          result.warnings.push(`Row ${i + 1}: Storno transaction detected (negative amount)`);
        }

        // Intra-CSV deduplication: same player+date+reason+amount → skip
        const paymentReason = category || subject;
        const txFingerprint = deterministicId([teamId, player.id, transactionDate.substring(0, 10), paymentReason, String(Math.abs(amountEUR))]);
        if (seenFingerprints.has(txFingerprint)) {
          result.duplicatesSkipped++;
          result.warnings.push(`Row ${i + 1}: Intra-CSV duplicate skipped: ${playerName} / ${paymentReason}`);
          continue;
        }
        seenFingerprints.add(txFingerprint);

        // Create payment record with deterministic ID (idempotent across re-imports)
        const payment: Payment = {
          id: txFingerprint,
          userId: player.id,
          teamId,
          category: PaymentCategory.PAYMENT,
          reason: paymentReason,
          amount: Math.abs(amountEUR),
          date: transactionDate,
          paid: !isStorno,
          paidAt: !isStorno ? transactionDate : null
        };

        paymentsToCreate.push({ userId: player.id, payment });
        result.recordsCreated++;

      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Write to Firestore in batches
    const BATCH_SIZE = 500;

    // Write players (to team subcollection)
    for (let i = 0; i < playersToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPlayers = playersToCreate.slice(i, i + BATCH_SIZE);

      for (const player of batchPlayers) {
        const playerRef = doc(firestore, `teams/${teamId}/players`, player.id);
        batch.set(playerRef, sanitizeFirestoreData(player as any));
      }

      await batch.commit();
    }

    // Write payments (in team/player subcollections)
    for (let i = 0; i < paymentsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPayments = paymentsToCreate.slice(i, i + BATCH_SIZE);

      for (const { userId, payment } of batchPayments) {
        const paymentRef = doc(firestore, `teams/${teamId}/players/${userId}/payments`, payment.id);
        batch.set(paymentRef, sanitizeFirestoreData({ ...payment, teamId } as any));
      }

      await batch.commit();
    }

    result.success = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.success = false;
  }

  return result;
}

/**
 * Generic import function for all CSV types
 */
export async function importCSVToFirestore(
  firestore: Firestore,
  teamId: string,
  text: string,
  type: 'dues' | 'punishments' | 'transactions',
  onProgress?: (progress: number, total: number) => void
): Promise<ImportResult> {
  switch (type) {
    case 'dues':
      return importDuesCSVToFirestore(firestore, teamId, text, onProgress);
    case 'punishments':
      return importPunishmentsCSVToFirestore(firestore, teamId, text, onProgress);
    case 'transactions':
      return importTransactionsCSVToFirestore(firestore, teamId, text, onProgress);
    default:
      return {
        success: false,
        rowsProcessed: 0,
        playersCreated: 0,
        recordsCreated: 0,
        errors: [`Unknown CSV type: ${type}`],
        warnings: [],
        skippedItems: [],
        duplicatesSkipped: 0,
      };
  }
}
