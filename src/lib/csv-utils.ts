/**
 * CSV Parsing Utilities
 *
 * Core utilities for parsing CSV data from bank statements and transaction exports.
 * Handles German date formats, currency conversion, and transaction parsing.
 */

/**
 * Parsed subject information extracted from transaction descriptions
 */
export interface ParsedSubject {
  category: string;
  player?: string;
  subcategory?: string;
  raw: string;
}

/**
 * Strips UTF-8 BOM (Byte Order Mark) from text if present.
 *
 * BOMs are commonly added by Windows applications and Excel exports.
 * The UTF-8 BOM is the byte sequence EF BB BF (U+FEFF).
 *
 * @param text - The text that may contain a BOM
 * @returns The text with BOM removed
 *
 * @example
 * ```ts
 * const csvWithBOM = "\uFEFFDate,Amount,Description";
 * const cleaned = stripBOM(csvWithBOM);
 * // Returns: "Date,Amount,Description"
 * ```
 */
export function stripBOM(text: string): string {
  if (!text) return text;

  // Check for UTF-8 BOM (U+FEFF)
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1);
  }

  return text;
}

/**
 * Parses a date string in German DD-MM-YYYY format.
 *
 * Handles various separators: dash (-), dot (.), and slash (/).
 *
 * @param dateStr - Date string in DD-MM-YYYY format
 * @returns Date object or null if parsing fails
 *
 * @example
 * ```ts
 * parseGermanDate("15-03-2024"); // Date object for March 15, 2024
 * parseGermanDate("15.03.2024"); // Date object for March 15, 2024
 * parseGermanDate("15/03/2024"); // Date object for March 15, 2024
 * parseGermanDate("invalid");    // null
 * parseGermanDate("");           // null
 * ```
 */
export function parseGermanDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  // Normalize separators to dashes
  const normalized = dateStr.trim().replace(/[./]/g, '-');

  // Match DD-MM-YYYY format
  const match = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, dayStr, monthStr, yearStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10) - 1; // JS months are 0-indexed
  const year = parseInt(yearStr, 10);

  // Validate ranges
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month, day);

  // Verify the date is valid (handles invalid dates like 31-02-2024)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Converts a cents string to euros (as a number).
 *
 * Handles German number format with comma as decimal separator
 * and optional thousand separators (dot or space).
 *
 * @param centsStr - Amount string in cents or euros (e.g., "1.234,56" or "1234")
 * @returns Amount in euros as a decimal number
 *
 * @example
 * ```ts
 * parseCentsToEuro("1234");       // 12.34
 * parseCentsToEuro("1.234");      // 12.34
 * parseCentsToEuro("1 234");      // 12.34
 * parseCentsToEuro("1.234,56");   // 12.3456 (1234.56 cents = 12.3456 euros)
 * parseCentsToEuro("50");         // 0.50
 * parseCentsToEuro("");           // 0
 * parseCentsToEuro("-1234");      // -12.34
 * ```
 */
export function parseCentsToEuro(centsStr: string): number {
  if (!centsStr || typeof centsStr !== 'string') {
    return 0;
  }

  // Remove whitespace
  let cleaned = centsStr.trim();

  if (cleaned === '' || cleaned === '-') {
    return 0;
  }

  // Check if negative
  const isNegative = cleaned.startsWith('-');
  if (isNegative) {
    cleaned = cleaned.slice(1);
  }

  // Remove thousand separators (dots and spaces)
  cleaned = cleaned.replace(/[\s.]/g, '');

  // Replace comma with dot for decimal parsing
  cleaned = cleaned.replace(',', '.');

  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    return 0;
  }

  // Convert cents to euros (divide by 100)
  const euros = amount / 100;

  return isNegative ? -euros : euros;
}

/**
 * Formats a number as a Euro currency string.
 *
 * Uses German locale formatting with comma as decimal separator
 * and space as thousand separator.
 *
 * @param amount - Amount in euros
 * @returns Formatted currency string
 *
 * @example
 * ```ts
 * formatEuro(12.34);    // "12,34 €"
 * formatEuro(1234.56);  // "1 234,56 €"
 * formatEuro(-50.00);   // "-50,00 €"
 * formatEuro(0);        // "0,00 €"
 * ```
 */
export function formatEuro(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0,00 €';
  }

  // Use German locale for formatting
  const formatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return formatted;
}

/**
 * Parses transaction subject/description to extract structured information.
 *
 * Expected formats:
 * - "Category - Player - Subcategory"
 * - "Category - Player"
 * - "Category"
 *
 * @param subject - Transaction description/subject
 * @returns Parsed subject with category, player, and subcategory
 *
 * @example
 * ```ts
 * parseTransactionSubject("FINE - John Doe - Late to practice");
 * // { category: "FINE", player: "John Doe", subcategory: "Late to practice", raw: "..." }
 *
 * parseTransactionSubject("DRINK - Jane Smith");
 * // { category: "DRINK", player: "Jane Smith", subcategory: undefined, raw: "..." }
 *
 * parseTransactionSubject("PAYMENT");
 * // { category: "PAYMENT", player: undefined, subcategory: undefined, raw: "..." }
 *
 * parseTransactionSubject("");
 * // { category: "UNKNOWN", player: undefined, subcategory: undefined, raw: "" }
 * ```
 */
export function parseTransactionSubject(subject: string): ParsedSubject {
  const raw = subject || '';
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      category: 'UNKNOWN',
      player: undefined,
      subcategory: undefined,
      raw,
    };
  }

  // Split by dash separator
  const parts = trimmed.split('-').map(part => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return {
      category: 'UNKNOWN',
      player: undefined,
      subcategory: undefined,
      raw,
    };
  }

  const [category, player, subcategory] = parts;

  return {
    category: category || 'UNKNOWN',
    player: player || undefined,
    subcategory: subcategory || undefined,
    raw,
  };
}

/**
 * Classifies a punishment/penalty reason as either a DRINK or FINE.
 *
 * Uses keyword matching to determine the type:
 * - DRINK: Contains keywords like "drink", "bier", "beer", "getränk", "beverage"
 * - FINE: Everything else (default)
 *
 * @param reason - The punishment reason/description
 * @returns Classification as 'DRINK' or 'FINE'
 *
 * @example
 * ```ts
 * classifyPunishment("Zu spät gekommen");           // "FINE"
 * classifyPunishment("Bier vergessen");             // "DRINK"
 * classifyPunishment("Drink after training");       // "DRINK"
 * classifyPunishment("Beer penalty");               // "DRINK"
 * classifyPunishment("Late to practice");           // "FINE"
 * classifyPunishment("");                           // "FINE"
 * ```
 */
export function classifyPunishment(reason: string): 'DRINK' | 'FINE' {
  if (!reason || typeof reason !== 'string') {
    return 'FINE';
  }

  const normalized = reason.toLowerCase().trim();

  // Explicitly exclude penalties that might contain drink keywords but are fines
  if (normalized.includes('kasten') || normalized.includes('runde')) {
    return 'FINE';
  }

  // Keywords that indicate a drink-related punishment
  const drinkKeywords = [
    'drink',
    'bier',
    'beer',
    'getränk',
    'beverage',
    'trinken',
    'alkohol',
    'alcohol',
    'apfelwein',
    'appler',
    'äppler',
    'cidre',
    'cider',
  ];

  const isDrink = drinkKeywords.some(keyword => normalized.includes(keyword));

  return isDrink ? 'DRINK' : 'FINE';
}

/**
 * Validates a CSV row has the minimum required fields.
 *
 * @param row - CSV row object with string keys
 * @param requiredFields - Array of required field names
 * @returns true if all required fields are present and non-empty
 *
 * @example
 * ```ts
 * const row = { date: "01-01-2024", amount: "1234", description: "Test" };
 * validateCsvRow(row, ["date", "amount"]); // true
 * validateCsvRow(row, ["date", "missing"]); // false
 * ```
 */
export function validateCsvRow(
  row: Record<string, string>,
  requiredFields: string[]
): boolean {
  if (!row || typeof row !== 'object') {
    return false;
  }

  return requiredFields.every(field => {
    const value = row[field];
    return value !== undefined && value !== null && value.toString().trim() !== '';
  });
}

/**
 * Normalizes CSV headers by removing BOM, trimming, and converting to lowercase.
 *
 * @param headers - Array of header strings
 * @returns Normalized header strings
 *
 * @example
 * ```ts
 * normalizeCsvHeaders(["\uFEFF Date ", " Amount", "DESCRIPTION "]);
 * // ["date", "amount", "description"]
 * ```
 */
export function normalizeCsvHeaders(headers: string[]): string[] {
  if (!Array.isArray(headers)) {
    return [];
  }

  return headers.map(header => {
    if (typeof header !== 'string') {
      return '';
    }
    return stripBOM(header).trim().toLowerCase();
  });
}

/**
 * Safely parses a numeric string, returning a default value on failure.
 *
 * @param value - String to parse
 * @param defaultValue - Value to return if parsing fails (default: 0)
 * @returns Parsed number or default value
 *
 * @example
 * ```ts
 * safeParseNumber("123");      // 123
 * safeParseNumber("12.34");    // 12.34
 * safeParseNumber("invalid");  // 0
 * safeParseNumber("", -1);     // -1
 * ```
 */
export function safeParseNumber(value: string, defaultValue: number = 0): number {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }

  const num = parseFloat(value.trim());
  return isNaN(num) ? defaultValue : num;
}

/**
 * Maps a raw beverage name to one of the three allowed categories:
 * 1. "Appler" (Apfelwein, Äppler, etc.)
 * 2. "Beer/Lemonade" (Bier, Radler, Limo, etc.)
 * 3. "Beverages" (Everything else)
 *
 * @param reason - The raw beverage name/reason
 * @returns The standardized category name
 */
export function mapBeverageCategory(reason: string): string {
  if (!reason) return 'Beverages';

  const normalized = reason.toLowerCase().trim();

  // 1. Appler check
  if (
    normalized.includes('apfelwein') ||
    normalized.includes('appler') ||
    normalized.includes('äppler')
  ) {
    return 'Appler';
  }

  // 2. Beer/Lemonade check
  const beerLimoKeywords = [
    'bier', 'beer', 'pils', 'weizen', 'helles', 'export',
    'radler', 'alster',
    'limo', 'lemonade', 'cola', 'fanta', 'sprite', 'wasser', 'water'
  ];

  if (beerLimoKeywords.some(k => normalized.includes(k))) {
    return 'Beer/Lemonade';
  }

  // 3. Default
  return 'Beverages';
}
