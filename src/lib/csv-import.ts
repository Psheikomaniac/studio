import * as Papa from 'papaparse';
import {
  Player,
  Fine,
  Payment,
  Beverage,
  BeverageConsumption,
  Due,
  DuePayment
} from './types';
import {
  players,
  fines,
  payments,
  beverages,
  beverageConsumptions,
  dues,
  duePayments
} from './static-data';

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

// Helper function to parse German date format (DD-MM-YYYY) to ISO string
function parseGermanDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') {
    return new Date().toISOString();
  }

  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return new Date().toISOString();
  }

  const [day, month, year] = parts;
  // Create date at noon UTC to avoid timezone issues
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
  return date.toISOString();
}

// Helper function to convert cents to EUR
function centsToEUR(cents: string | number): number {
  const amount = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  return amount / 100;
}

// Helper to validate player names; skip rows with missing or 'Unknown' player names
function isInvalidPlayerName(name?: string | null): boolean {
  const normalized = (name ?? '').trim().toLowerCase();
  if (!normalized) return true;
  // Treat explicit unknown placeholders as invalid
  return normalized === 'unknown' || normalized === 'player unknown';
}

// Helper function to find or create player by name and/or ID
function findOrCreatePlayer(name: string, id?: string): Player {
  // First try to find by ID if provided
  if (id) {
    const existingById = players.find(p => p.id === id);
    if (existingById) {
      return existingById;
    }
  }

  // Then try to find by name (case-insensitive, trimmed)
  const normalizedName = name.trim().toLowerCase();
  const existingByName = players.find(p => p.name.toLowerCase() === normalizedName);
  if (existingByName) {
    return existingByName;
  }

  // Create new player
  const newPlayer: Player = {
    id: id || generateId('player'),
    name: name.trim(),
    nickname: name.trim().split(' ')[0], // Use first name as nickname
    photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=0ea5e9&color=fff`,
    balance: 0,
    email: undefined,
    phone: undefined,
    totalUnpaidPenalties: 0,
    totalPaidPenalties: 0,
  };

  players.push(newPlayer);
  return newPlayer;
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

// Helper function to find or create beverage by name
function findOrCreateBeverage(name: string, price: number): Beverage {
  const normalizedName = name.trim();
  const existing = beverages.find(b => b.name.toLowerCase() === normalizedName.toLowerCase());

  if (existing) {
    return existing;
  }

  const newBeverage: Beverage = {
    id: generateId('bev'),
    name: normalizedName,
    price: price
  };

  beverages.push(newBeverage);
  return newBeverage;
}

// Helper function to deduplicate players
export function deduplicatePlayers(playerList: Player[]): Player[] {
  const seen = new Map<string, Player>();
  const duplicates: string[] = [];

  for (const player of playerList) {
    const normalizedName = player.name.toLowerCase().trim();

    if (seen.has(normalizedName)) {
      duplicates.push(player.name);
      // Merge the player data (keep the first one, but merge balances)
      const existing = seen.get(normalizedName)!;
      existing.balance += player.balance;
      existing.totalPaidPenalties += player.totalPaidPenalties;
      existing.totalUnpaidPenalties += player.totalUnpaidPenalties;
    } else {
      seen.set(normalizedName, player);
    }
  }

  if (duplicates.length > 0) {
    console.log(`Deduplicated ${duplicates.length} players: ${duplicates.join(', ')}`);
  }

  return Array.from(seen.values());
}

/**
 * Import Dues CSV
 * CSV Format: team_id, team_name, due_name, due_created, due_amount, due_currency,
 *             due_archived, user_id, username, user_paid, user_payment_date, search_params
 */
export async function importDuesCSV(text: string): Promise<ImportResult> {
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
    const initialPlayerCount = players.length;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        result.rowsProcessed++;

        // Validate required fields
        if (!row.due_name || !row.due_amount || !row.username) {
          result.warnings.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }
        // Skip rows without a valid player name or with placeholder 'Unknown'
        if (isInvalidPlayerName(row.username)) {
          result.warnings.push(`Row ${i + 1}: Skipped due to missing or unknown player name`);
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
          // Check if due already exists in static data
          due = dues.find(d => d.name === dueName);

          if (!due) {
            due = {
              id: generateId('due'),
              name: dueName,
              amount: amountEUR,
              createdAt: dueCreated,
              active: row.due_archived !== 'YES',
              archived: row.due_archived === 'YES'
            };
            dues.push(due);
            duesMap.set(dueName, due);
            result.recordsCreated++;
          } else {
            duesMap.set(dueName, due);
          }
        }

        // Find or create player
        const player = findOrCreatePlayer(row.username, row.user_id);

        // Determine payment status
        const isPaid = row.user_paid === 'STATUS_PAID';
        const isExempt = row.user_paid === 'STATUS_EXEMPT';

        // Create DuePayment record if not exists
        const existingPayment = duePayments.find(
          dp => dp.dueId === due!.id && dp.userId === player.id
        );

        if (!existingPayment) {
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

          duePayments.push(duePayment);
          result.recordsCreated++;
        }

      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.playersCreated = players.length - initialPlayerCount;
    result.success = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.success = false;
  }

  return result;
}

/**
 * Import Punishments CSV
 * CSV Format: team_id, team_name, penatly_created, penatly_user, penatly_reason,
 *             penatly_archived, penatly_paid, penatly_amount, penatly_currency,
 *             penatly_subject, search_params
 */
export async function importPunishmentsCSV(text: string): Promise<ImportResult> {
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
    const initialPlayerCount = players.length;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        result.rowsProcessed++;

        // Validate required fields
        if (!row.penatly_user || !row.penatly_reason || !row.penatly_amount) {
          result.warnings.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Parse dates
        const createdDate = parseGermanDate(row.penatly_created);
        const paidDate = row.penatly_paid ? parseGermanDate(row.penatly_paid) : undefined;

        // Convert amount from cents to EUR
        const amountEUR = centsToEUR(row.penatly_amount);

        // Validate amount
        if (isNaN(amountEUR)) {
          result.warnings.push(`Row ${i + 1}: Invalid amount: ${row.penatly_amount}`);
          continue;
        }

        // Skip zero-amount penalties with warning
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
        const player = findOrCreatePlayer(row.penatly_user);

        // Classify as DRINK or FINE
        const type = classifyPunishment(row.penatly_reason);

        if (type === 'DRINK') {
          // Create beverage consumption record
          const beverage = findOrCreateBeverage(row.penatly_reason, amountEUR);

          const consumption: BeverageConsumption = {
            id: generateId('bc'),
            userId: player.id,
            beverageId: beverage.id,
            beverageName: beverage.name,
            amount: amountEUR,
            date: createdDate,
            paid: !!paidDate,
            paidAt: paidDate || null,
            createdAt: createdDate
          };

          beverageConsumptions.push(consumption);
          result.recordsCreated++;

        } else {
          // Create fine record
          const fine: Fine = {
            id: generateId('fine'),
            userId: player.id,
            reason: row.penatly_reason.trim(),
            amount: amountEUR,
            date: createdDate,
            paid: !!paidDate,
            paidAt: paidDate || null,
            createdAt: createdDate,
            updatedAt: paidDate || createdDate
          };

          fines.push(fine);
          result.recordsCreated++;
        }

      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.playersCreated = players.length - initialPlayerCount;
    result.success = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.success = false;
  }

  return result;
}

/**
 * Import Transactions CSV
 * CSV Format: team_id, team_name, transaction_date, transaction_amount, transaction_currency,
 *             transaction_subject, balance_total, balance_filtered, search_params
 */
export async function importTransactionsCSV(text: string): Promise<ImportResult> {
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
    const initialPlayerCount = players.length;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        result.rowsProcessed++;

        // Validate required fields
        if (!row.transaction_date || !row.transaction_amount || !row.transaction_subject) {
          result.warnings.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Parse date
        const transactionDate = parseGermanDate(row.transaction_date);

        // Convert amount from cents to EUR (positive for credit, negative for debit)
        const amountEUR = centsToEUR(row.transaction_amount);

        // Validate amount
        if (isNaN(amountEUR)) {
          result.warnings.push(`Row ${i + 1}: Invalid amount: ${row.transaction_amount}`);
          continue;
        }

        // Parse transaction subject to extract player name and category
        // Format: "Strafen: Player Name (Category)" or "Einzahlung: Player Name"
        const subject = row.transaction_subject.trim();
        let playerName = '';
        let category = '';

        // Try to extract player name from subject
        const colonIndex = subject.indexOf(':');
        if (colonIndex > -1) {
          const afterColon = subject.substring(colonIndex + 1).trim();

          // Check for parentheses (category)
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
          // No colon, try to extract name from subject
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
        const player = findOrCreatePlayer(playerName);

        // Determine if this is a storno (negative amount means refund/correction)
        const isStorno = amountEUR < 0;
        if (isStorno) {
          result.warnings.push(`Row ${i + 1}: Storno transaction detected (negative amount)`);
        }

        // Create payment record
        const payment: Payment = {
          id: generateId('payment'),
          userId: player.id,
          reason: category || subject,
          amount: Math.abs(amountEUR), // Store as positive amount
          date: transactionDate,
          paid: !isStorno, // Stornos are not considered "paid"
          paidAt: !isStorno ? transactionDate : null
        };

        payments.push(payment);
        result.recordsCreated++;

      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.playersCreated = players.length - initialPlayerCount;
    result.success = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.success = false;
  }

  return result;
}

/**
 * Main import function that handles all three CSV types
 */
export async function importCSV(
  text: string,
  type: 'dues' | 'punishments' | 'transactions'
): Promise<ImportResult> {
  switch (type) {
    case 'dues':
      return importDuesCSV(text);
    case 'punishments':
      return importPunishmentsCSV(text);
    case 'transactions':
      return importTransactionsCSV(text);
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
