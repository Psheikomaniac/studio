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
import { Player, Fine, Payment, Due, DuePayment, Beverage, BeverageConsumption } from './types';

export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  playersCreated: number;
  recordsCreated: number;
  errors: string[];
  warnings: string[];
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

// Helper function to classify punishment as DRINK or FINE
function classifyPunishment(reason: string): 'DRINK' | 'FINE' {
  const lowerReason = reason.toLowerCase();
  const drinkKeywords = ['getränke', 'getränk', 'bier', 'beer', 'drink', 'beverage', 'wasser', 'water', 'cola', 'sprite'];

  for (const keyword of drinkKeywords) {
    if (lowerReason.includes(keyword)) {
      return 'DRINK';
    }
  }

  return 'FINE';
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
  name: string,
  id?: string,
  existingPlayers?: Map<string, Player>
): Promise<Player> {
  const normalizedName = name.trim().toLowerCase();

  // First check in-memory cache
  if (existingPlayers?.has(normalizedName)) {
    return existingPlayers.get(normalizedName)!;
  }

  // Then check Firestore by ID if provided
  if (id) {
    const docSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', id)));
    if (!docSnap.empty) {
      const player = { id, ...docSnap.docs[0].data() } as Player;
      (player as any).__isNew = false;
      existingPlayers?.set(normalizedName, player);
      return player;
    }
  }

  // Then check Firestore by name
  const usersRef = collection(firestore, 'users');
  const q = query(usersRef);
  const snapshot = await getDocs(q);

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
    totalUnpaidPenalties: 0,
    totalPaidPenalties: 0,
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
  text: string,
  onProgress?: (progress: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    rowsProcessed: 0,
    playersCreated: 0,
    recordsCreated: 0,
    errors: [],
    warnings: []
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
          continue;
        }

        // Find or create Due record
        const dueName = row.due_name.trim();
        let due = duesMap.get(dueName);

        if (!due) {
          due = {
            id: generateId('due'),
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
          continue;
        }

        // Find or create player
        const player = await findOrCreatePlayer(firestore, row.username, row.user_id, existingPlayers);

        // Track if player is new (based on __isNew flag set by finder)
        if ((player as any).__isNew && !playersToCreate.some(p => p.id === player.id)) {
          playersToCreate.push(player);
          result.playersCreated++;
        }

        // Determine payment status
        const isPaid = row.user_paid === 'STATUS_PAID';
        const isExempt = row.user_paid === 'STATUS_EXEMPT';

        // Create DuePayment record
        const duePayment: DuePayment = {
          id: generateId('dp'),
          dueId: due.id,
          userId: player.id,
          userName: player.name,
          amountDue: amountEUR,
          paid: isPaid,
          paidAt: isPaid && paymentDate ? paymentDate : null,
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
        const playerRef = doc(firestore, 'users', player.id);
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

    // Write due payments (in user subcollections)
    for (let i = 0; i < duePaymentsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPayments = duePaymentsToCreate.slice(i, i + BATCH_SIZE);

      for (const payment of batchPayments) {
        const paymentRef = doc(firestore, `users/${payment.userId}/duePayments`, payment.id);
        batch.set(paymentRef, sanitizeFirestoreData(payment as any));
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
 * Import Punishments CSV into Firestore
 */
export async function importPunishmentsCSVToFirestore(
  firestore: Firestore,
  text: string,
  onProgress?: (progress: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    rowsProcessed: 0,
    playersCreated: 0,
    recordsCreated: 0,
    errors: [],
    warnings: []
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
    const existingBeverages = new Map<string, Beverage>();
    const playersToCreate: Player[] = [];
    const beveragesToCreate: Beverage[] = [];
    const finesToCreate: { userId: string; fine: Fine }[] = [];
    const consumptionsToCreate: { userId: string; consumption: BeverageConsumption }[] = [];
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
        if (!row.penatly_user || !row.penatly_reason || !row.penatly_amount) {
          result.warnings.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Parse dates
        const createdDate = parseGermanDate(row.penatly_created);
        const { paid: isPaidFlag, paidAt: parsedPaidAt } = parsePaidStatus(row.penatly_paid);

        // Convert amount from cents to EUR
        const amountEUR = centsToEUR(row.penatly_amount);

        // Validate amount
        if (isNaN(amountEUR)) {
          result.warnings.push(`Row ${i + 1}: Invalid amount: ${row.penatly_amount}`);
          continue;
        }

        // Skip zero-amount penalties
        if (amountEUR === 0) {
          result.warnings.push(`Row ${i + 1}: Skipped zero-amount penalty`);
          continue;
        }

        // Skip invalid or unknown player names
        if (isInvalidPlayerName(row.penatly_user)) {
          result.warnings.push(`Row ${i + 1}: Skipped due to missing or unknown player name`);
          continue;
        }

        // Find or create player
        const player = await findOrCreatePlayer(firestore, row.penatly_user, undefined, existingPlayers);

        // Queue player creation if this is a newly discovered player
        if ((player as any).__isNew && !playersToCreate.some(p => p.id === player.id)) {
          playersToCreate.push(player);
          result.playersCreated++;
        }

        // Special case: Guthaben top-ups appear in punishments export in some datasets
        // Create them as Payments here so balances/tooltip can reflect credits even if only punishments CSV is imported
        const reasonLower = (row.penatly_reason || '').trim().toLowerCase();
        const isCreditGuthabenRest = reasonLower === 'guthaben rest' || reasonLower.includes('guthaben rest');
        const isCreditGuthaben = reasonLower === 'guthaben' || reasonLower.includes('guthaben') || reasonLower.startsWith('einzahlung');
        if (isCreditGuthabenRest || isCreditGuthaben) {
          const payment: Payment = {
            id: generateId('payment'),
            userId: player.id,
            reason: row.penatly_reason.trim(),
            amount: amountEUR,
            date: createdDate,
            // Treat credits imported via punishments as settled top-ups
            paid: true,
            paidAt: parsedPaidAt || createdDate
          };
          paymentsToCreate.push({ userId: player.id, payment });
          result.recordsCreated++;
          continue;
        }

        // Classify as DRINK or FINE
        const type = classifyPunishment(row.penatly_reason);

        if (type === 'DRINK') {
          // Create beverage consumption record
          const beverage = await findOrCreateBeverage(firestore, row.penatly_reason, amountEUR, existingBeverages);

          if ((beverage as any).__isNew && !beveragesToCreate.some(b => b.id === (beverage as any).id)) {
            beveragesToCreate.push(beverage);
          }

          const consumption: BeverageConsumption = {
            id: generateId('bc'),
            userId: player.id,
            beverageId: beverage.id,
            beverageName: beverage.name,
            amount: amountEUR,
            date: createdDate,
            paid: isPaidFlag,
            paidAt: parsedPaidAt,
            createdAt: createdDate
          };

          consumptionsToCreate.push({ userId: player.id, consumption });
          result.recordsCreated++;

        } else {
          // Create fine record
          const fine: Fine = {
            id: generateId('fine'),
            userId: player.id,
            reason: row.penatly_reason.trim(),
            amount: amountEUR,
            date: createdDate,
            paid: isPaidFlag,
            paidAt: parsedPaidAt,
            createdAt: createdDate,
            updatedAt: parsedPaidAt || createdDate
          };

          finesToCreate.push({ userId: player.id, fine });
          result.recordsCreated++;
        }

      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Write to Firestore in batches
    const BATCH_SIZE = 500;

    // Write players
    for (let i = 0; i < playersToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPlayers = playersToCreate.slice(i, i + BATCH_SIZE);

      for (const player of batchPlayers) {
        const playerRef = doc(firestore, 'users', player.id);
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

    // Write payments (in user subcollections)
    for (let i = 0; i < paymentsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPayments = paymentsToCreate.slice(i, i + BATCH_SIZE);

      for (const { userId, payment } of batchPayments) {
        const paymentRef = doc(firestore, `users/${userId}/payments`, payment.id);
        batch.set(paymentRef, sanitizeFirestoreData(payment as any));
      }

      await batch.commit();
    }

    // Write fines (in user subcollections)
    for (let i = 0; i < finesToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchFines = finesToCreate.slice(i, i + BATCH_SIZE);

      for (const { userId, fine } of batchFines) {
        const fineRef = doc(firestore, `users/${userId}/fines`, fine.id);
        batch.set(fineRef, sanitizeFirestoreData(fine as any));
      }

      await batch.commit();
    }

    // Write beverage consumptions (in user subcollections)
    for (let i = 0; i < consumptionsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchConsumptions = consumptionsToCreate.slice(i, i + BATCH_SIZE);

      for (const { userId, consumption } of batchConsumptions) {
        const consumptionRef = doc(firestore, `users/${userId}/beverageConsumptions`, consumption.id);
        batch.set(consumptionRef, sanitizeFirestoreData(consumption as any));
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
  text: string,
  onProgress?: (progress: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    rowsProcessed: 0,
    playersCreated: 0,
    recordsCreated: 0,
    errors: [],
    warnings: []
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

        // Skip Beiträge (membership dues) here — handled exclusively by the Dues CSV importer
        const subjectPrefix = subject.split(':')[0].trim().toLowerCase();
        if (subjectPrefix.includes('beitr')) { // matches "beitrag", "beiträge"
          result.warnings.push(`Row ${i + 1}: Skipped Beiträge transaction (handled via dues CSV): ${subject}`);
          continue;
        }

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

        if (!playerName) {
          result.warnings.push(`Row ${i + 1}: Could not extract player name from subject: ${subject}`);
          continue;
        }

        // Skip invalid or unknown player names derived from subject
        if (isInvalidPlayerName(playerName)) {
          result.warnings.push(`Row ${i + 1}: Skipped due to missing or unknown player name in subject`);
          continue;
        }

        // Find or create player
        const player = await findOrCreatePlayer(firestore, playerName, undefined, existingPlayers);

        if ((player as any).__isNew && !playersToCreate.some(p => p.id === player.id)) {
          playersToCreate.push(player);
          result.playersCreated++;
        }

        // Determine if this is a storno
        const isStorno = amountEUR < 0;
        if (isStorno) {
          result.warnings.push(`Row ${i + 1}: Storno transaction detected (negative amount)`);
        }

        // Create payment record
        const payment: Payment = {
          id: generateId('payment'),
          userId: player.id,
          reason: category || subject,
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

    // Write players
    for (let i = 0; i < playersToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPlayers = playersToCreate.slice(i, i + BATCH_SIZE);

      for (const player of batchPlayers) {
        const playerRef = doc(firestore, 'users', player.id);
        batch.set(playerRef, sanitizeFirestoreData(player as any));
      }

      await batch.commit();
    }

    // Write payments (in user subcollections)
    for (let i = 0; i < paymentsToCreate.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const batchPayments = paymentsToCreate.slice(i, i + BATCH_SIZE);

      for (const { userId, payment } of batchPayments) {
        const paymentRef = doc(firestore, `users/${userId}/payments`, payment.id);
        batch.set(paymentRef, sanitizeFirestoreData(payment as any));
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
  text: string,
  type: 'dues' | 'punishments' | 'transactions',
  onProgress?: (progress: number, total: number) => void
): Promise<ImportResult> {
  switch (type) {
    case 'dues':
      return importDuesCSVToFirestore(firestore, text, onProgress);
    case 'punishments':
      return importPunishmentsCSVToFirestore(firestore, text, onProgress);
    case 'transactions':
      return importTransactionsCSVToFirestore(firestore, text, onProgress);
    default:
      return {
        success: false,
        rowsProcessed: 0,
        playersCreated: 0,
        recordsCreated: 0,
        errors: [`Unknown CSV type: ${type}`],
        warnings: []
      };
  }
}
