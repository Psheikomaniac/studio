# CSV Import Module

Complete implementation of CSV parsing and import logic for all three CSV types: Dues, Punishments, and Transactions.

## Files Created

### 1. `/src/lib/csv-import.ts` (Main Module)
The core import module with three main functions and helper utilities.

#### Main Import Functions

##### `importDuesCSV(text: string): Promise<ImportResult>`
Imports dues and due payments from CSV.

**CSV Structure:**
```
team_id, team_name, due_name, due_created, due_amount, due_currency,
due_archived, user_id, username, user_paid, user_payment_date, search_params
```

**Processing:**
- Strips UTF-8 BOM marker
- Parses CSV with semicolon delimiter
- Converts German date format (DD-MM-YYYY) to ISO
- Converts amounts from cents to EUR
- Creates or finds Due records by name
- Creates DuePayment records for each player
- Handles payment statuses: STATUS_PAID, STATUS_UNPAID, STATUS_EXEMPT
- Auto-creates players if they don't exist

##### `importPunishmentsCSV(text: string): Promise<ImportResult>`
Imports fines and beverage consumptions from CSV.

**CSV Structure:**
```
team_id, team_name, penatly_created, penatly_user, penatly_reason,
penatly_archived, penatly_paid, penatly_amount, penatly_currency,
penatly_subject, search_params
```

**Processing:**
- Strips UTF-8 BOM marker
- Parses CSV with semicolon delimiter
- Converts German date format to ISO
- Converts amounts from cents to EUR
- Classifies each record as DRINK or FINE using `classifyPunishment()`
- Creates Fine records for penalties
- Creates BeverageConsumption records for drinks
- Skips zero-amount penalties with warning
- Auto-creates players and beverages

**Classification Logic:**
- DRINK: Reason contains keywords like "getränke", "bier", "drink", "beverage"
- FINE: All other reasons

##### `importTransactionsCSV(text: string): Promise<ImportResult>`
Imports payment transactions from CSV.

**CSV Structure:**
```
team_id, team_name, transaction_date, transaction_amount, transaction_currency,
transaction_subject, balance_total, balance_filtered, search_params
```

**Processing:**
- Strips UTF-8 BOM marker
- Parses CSV with semicolon delimiter
- Converts German date format to ISO
- Converts amounts from cents to EUR
- Parses transaction_subject to extract player name and category
  - Format: "Strafen: Player Name (Category)"
  - Format: "Einzahlung: Player Name"
- Creates Payment records
- Handles negative amounts (storno/refunds)
- Auto-creates players

##### `importCSV(text: string, type: 'dues' | 'punishments' | 'transactions'): Promise<ImportResult>`
Generic import function that routes to the appropriate importer.

#### Helper Functions

##### `stripBOM(text: string): string`
Removes UTF-8 Byte Order Mark (BOM) if present at the start of the file.

##### `generateId(prefix: string): string`
Generates unique IDs for new records using timestamp and random string.

##### `parseGermanDate(dateStr: string): string`
Converts German date format (DD-MM-YYYY) to ISO 8601 string.
- Handles empty dates (returns current date)
- Creates dates at noon UTC to avoid timezone issues

##### `centsToEUR(cents: string | number): number`
Converts amount from cents to EUR (divides by 100).

##### `findOrCreatePlayer(name: string, id?: string): Player`
Finds existing player or creates new one.
- First searches by ID (if provided)
- Then searches by name (case-insensitive)
- Creates new player with auto-generated photo URL if not found
- Uses first name as nickname for new players
- Adds new players to the global players array

##### `classifyPunishment(reason: string): 'DRINK' | 'FINE'`
Classifies a punishment as beverage consumption or fine.
- DRINK: Contains keywords like "getränke", "bier", "drink", "beverage", "wasser", "cola"
- FINE: Everything else

##### `findOrCreateBeverage(name: string, price: number): Beverage`
Finds existing beverage by name or creates new one.

##### `deduplicatePlayers(players: Player[]): Player[]`
Merges duplicate players based on name (exported for external use).
- Keeps first occurrence
- Merges balance and penalty totals
- Returns deduplicated list

#### Data Validation

Each import function validates:
- **Required fields**: Checks all mandatory columns exist
- **Date formats**: Validates and parses DD-MM-YYYY format
- **Amount ranges**: Ensures amounts are valid numbers
- **Data quality**:
  - Warns about zero amounts
  - Warns about missing player names
  - Warns about unparseable subjects
  - Warns about storno transactions

#### Return Type: ImportResult

```typescript
interface ImportResult {
  success: boolean;          // True if no errors
  rowsProcessed: number;     // Total CSV rows processed
  playersCreated: number;    // New players auto-created
  recordsCreated: number;    // New records (fines, payments, etc.)
  errors: string[];          // Fatal errors
  warnings: string[];        // Data quality warnings
}
```

### 2. `/src/lib/types.ts` (Updated)
Added `BeverageConsumption` interface:

```typescript
export interface BeverageConsumption {
  id: string;
  userId: string;
  beverageId: string;
  beverageName: string;
  amount: number;           // Price of beverage
  date: string;             // ISO string
  paid: boolean;
  paidAt?: string;          // ISO string
  createdAt: string;        // ISO string
}
```

### 3. `/src/lib/static-data.ts` (Updated)
Added exports for imported data:

```typescript
export const dues: Due[] = [...];
export const duePayments: DuePayment[] = [...];
export const beverageConsumptions: BeverageConsumption[] = [];
```

Pre-populated with example data for dues and duePayments.

### 4. `/src/lib/csv-import-example.ts` (Documentation)
Example usage demonstrating all import functions.

## Dependencies

Installed packages:
- `papaparse` - CSV parsing library
- `@types/papaparse` - TypeScript definitions

## Usage Example

```typescript
import { importDuesCSV } from './csv-import';
import * as fs from 'fs';

async function importData() {
  const csvText = fs.readFileSync('data/cashbox-dues.csv', 'utf-8');
  const result = await importDuesCSV(csvText);

  console.log(`Success: ${result.success}`);
  console.log(`Processed: ${result.rowsProcessed} rows`);
  console.log(`Created: ${result.playersCreated} players`);
  console.log(`Created: ${result.recordsCreated} records`);

  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
}
```

## CSV Files Available

Located in `/data/`:
- `cashbox-dues-27-10-2025-132824.csv` (482 lines)
- `cashbox-punishments-27-10-2025-132755.csv` (1,973 lines)
- `cashbox-transactions-27-10-2025-132849.csv` (2,450 lines)

## Features Implemented

### Core Functionality
- ✅ UTF-8 BOM handling
- ✅ Semicolon delimiter parsing
- ✅ German date format parsing (DD-MM-YYYY)
- ✅ Cents to EUR conversion
- ✅ Player auto-creation
- ✅ Duplicate player detection
- ✅ Data validation and error handling

### Import-Specific Features
- ✅ Dues: Due record creation and payment tracking
- ✅ Punishments: DRINK vs FINE classification
- ✅ Punishments: Beverage auto-creation
- ✅ Transactions: Subject parsing (player name extraction)
- ✅ Transactions: Storno detection

### Data Quality
- ✅ Comprehensive error reporting
- ✅ Warning system for data issues
- ✅ Row-level error tracking
- ✅ Graceful handling of missing/invalid data

## Implementation Notes

### Date Handling
All dates are stored as ISO 8601 strings. German format (DD-MM-YYYY) from CSV is converted to ISO format for consistency.

### Amount Handling
CSV amounts are in cents (e.g., 5000 = 50.00 EUR). The import functions automatically convert to EUR.

### Player Creation
New players are automatically created with:
- Auto-generated ID
- Name from CSV
- First name as nickname
- Random photo URL (using picsum with name as seed)
- Zero initial balances

### Beverage Classification
Keywords checked (case-insensitive):
- getränke, getränk
- bier, beer
- drink, beverage
- wasser, water
- cola, sprite

### Transaction Subject Parsing
Supports formats:
- "Strafen: Player Name (Category)"
- "Einzahlung: Player Name"
- "Category: Player Name (Details)"

### Error Recovery
The import process is resilient:
- Continues processing after row errors
- Logs all errors with row numbers
- Returns partial success with warnings
- Doesn't rollback on errors

## Type Safety

All functions are fully typed with TypeScript:
- Strong typing for CSV row data
- Type-safe Player/Fine/Payment creation
- Validated date/amount conversions
- No `any` types in production code

## Future Enhancements

Potential improvements:
- Transaction rollback on critical errors
- CSV preview before import
- Duplicate detection before creation
- Custom player name mapping
- Import progress callbacks
- Batch size configuration
- Memory optimization for large files

## Testing

To test the implementation:

```bash
# Run type check
npx tsc --noEmit src/lib/csv-import.ts

# Test with actual data (example file)
npx tsx src/lib/csv-import-example.ts
```

## Status

✅ **COMPLETE** - All requirements implemented and tested.

File path: `/Users/private/projects/studio/src/lib/csv-import.ts`
