# Integration Test Suite Documentation

## Overview

Comprehensive integration test suite for the balanceUp application. These tests validate complete workflows using real Firebase Firestore operations via the Firebase Emulator, ensuring correctness of business logic, data persistence, and real-time synchronization.

## Architecture

### Test Environment

- **Framework**: Vitest 4.0.4
- **Firebase Emulator**: Firestore + Auth
- **Test Isolation**: Each test suite uses independent Firestore instances
- **Data Management**: Automated cleanup between tests

### Firebase Emulator Configuration

```json
{
  "emulators": {
    "firestore": {
      "port": 8080,
      "host": "127.0.0.1"
    },
    "auth": {
      "port": 9099,
      "host": "127.0.0.1"
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

## Test Structure

```
tests/integration/
├── setup.ts                           # Firebase Emulator connection setup
├── helpers/
│   ├── seed-data.ts                  # Firestore seeding utilities
│   └── test-builders.ts              # Builder pattern for test data
├── player-workflows.test.ts          # Player CRUD workflows (11 test suites, 15+ tests)
├── transaction-workflows.test.ts     # Fine/Payment workflows (10 test suites, 20+ tests)
├── csv-import.test.ts                # End-to-end CSV imports (8 test suites, 20+ tests)
├── dues-management.test.ts           # Dues and auto-payment (9 test suites, 18+ tests)
├── ai-fine-suggestions.test.ts       # AI-powered suggestions (5 test suites, 10+ tests)
└── real-time-sync.test.ts            # Firestore listeners (4 test suites, 8+ tests)
```

## Running Integration Tests

### Prerequisites

1. **Install Firebase Tools**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Verify Java Installation** (required for Firestore Emulator):
   ```bash
   java -version
   # Should show Java 11 or higher
   ```

### Start Firebase Emulator

**Option 1: Using Helper Script**
```bash
./scripts/start-emulator.sh
```

**Option 2: Manually**
```bash
firebase emulators:start --only firestore,auth,ui
```

The emulator UI will be available at: http://127.0.0.1:4000

### Run Integration Tests

**With Emulator Running:**
```bash
npm run test tests/integration
```

**Run Single Test File:**
```bash
npm run test tests/integration/player-workflows.test.ts
```

**Run with Coverage:**
```bash
npm run test:coverage -- tests/integration
```

**Automated Test Runner (starts emulator automatically):**
```bash
./scripts/test-integration.sh
```

### Watch Mode
```bash
npm run test -- --watch tests/integration
```

## Test Coverage

### 1. Player Workflows (`player-workflows.test.ts`)

**Coverage**: Complete player lifecycle

#### Test Scenarios:
- ✅ Player creation with default values
- ✅ Multiple player creation and retrieval
- ✅ Custom ID assignment
- ✅ Player information updates
- ✅ Inactive player management
- ✅ Soft delete (mark as deleted)
- ✅ Hard delete (remove from Firestore)
- ✅ Complete workflow: Create → Add Fine → Add Payment → Calculate Balance
- ✅ Concurrent player operations
- ✅ Concurrent updates to same player
- ✅ Error handling (non-existent players)

**Key Tests:**
```typescript
it('should complete full workflow with balance calculation', async () => {
  // Given: Create player
  // When: Add payment (€100) and fine (€15)
  // Then: Balance = €85
});

it('should handle multiple simultaneous player creations', async () => {
  // Given: 5 concurrent creation requests
  // When: All execute simultaneously
  // Then: All succeed without conflicts
});
```

### 2. Transaction Workflows (`transaction-workflows.test.ts`)

**Coverage**: Fines, payments, and balance calculations

#### Test Scenarios:
- ✅ Unpaid fine creation (zero balance)
- ✅ Auto-paid fine (sufficient balance)
- ✅ Partially paid fine (insufficient balance)
- ✅ Payment creation (always paid as credit)
- ✅ Multiple payments retrieval
- ✅ Fine status toggle (paid ↔ unpaid)
- ✅ Apply additional payment to partial fine
- ✅ Complete partial payment to fully paid
- ✅ Complex balance calculation (payments + fines + beverages)
- ✅ Negative balance scenarios
- ✅ Firestore transaction rollback on failure
- ✅ Firestore transaction commit on success
- ✅ Soft/hard fine deletion
- ✅ Error handling (non-existent fines)

**Key Tests:**
```typescript
it('should calculate correct balance with multiple transaction types', async () => {
  // Given: €150 payments, €15 fine, €5 partial fine, €3.50 beverage
  // When: Calculating balance
  // Then: Balance = €126.50
});

it('should rollback on transaction failure', async () => {
  // Given: Fine with initial state
  // When: Transaction fails after update
  // Then: Fine remains unchanged (rollback successful)
});
```

### 3. CSV Import Workflows (`csv-import.test.ts`)

**Coverage**: End-to-end CSV processing with Firestore persistence

#### Test Scenarios:
- ✅ Dues CSV import with player creation
- ✅ Auto-exemption for old dues on new players
- ✅ Skip invalid/unknown player names
- ✅ Handle invalid amounts gracefully
- ✅ Punishments CSV import (fines + drinks classification)
- ✅ Import "Guthaben" as payment (credit)
- ✅ Skip zero-amount penalties
- ✅ Parse paid status from date fields
- ✅ Transactions CSV import
- ✅ Skip "Beiträge" (handled by dues CSV)
- ✅ Handle storno (negative amount) transactions
- ✅ Handle malformed transaction subjects
- ✅ BOM (Byte Order Mark) handling
- ✅ Empty CSV handling
- ✅ Collect multiple errors without failing import
- ✅ Large batch import (>500 records)
- ✅ Progress callback during import

**Key Tests:**
```typescript
it('should import dues CSV with player creation', async () => {
  // Given: CSV with 3 dues for 2 players
  // When: Importing CSV
  // Then: 2 players created, 2 dues created, 3 due payments created
});

it('should handle batch imports (> 500 records)', async () => {
  // Given: CSV with 600 rows
  // When: Importing
  // Then: All 600 records successfully imported in batches
});
```

### 4. Dues Management (`dues-management.test.ts`)

**Coverage**: Dues creation, auto-payment logic, exemptions

#### Test Scenarios:
- ✅ Due creation
- ✅ Archived due creation
- ✅ Unpaid due payment (zero balance)
- ✅ Auto-paid due (sufficient balance)
- ✅ Partially paid due (insufficient balance)
- ✅ Exempt due (no auto-payment)
- ✅ Toggle due payment status
- ✅ Apply additional payment to partial due
- ✅ Complete partial due payment
- ✅ Balance calculation with unpaid dues
- ✅ Exclude exempt dues from balance
- ✅ Balance with partially paid dues
- ✅ Multiple dues per player
- ✅ Soft/hard due payment deletion
- ✅ Error handling (non-existent dues)

**Key Tests:**
```typescript
it('should not apply auto-payment to exempt due', async () => {
  // Given: Player with €100 balance
  // When: Creating exempt due of €50
  // Then: Due remains unpaid (exempt overrides auto-payment)
});

it('should exclude exempt dues from balance calculation', async () => {
  // Given: €50 exempt due + €40 regular due
  // When: Calculating balance
  // Then: Balance = -€40 (exempt ignored)
});
```

### 5. AI Fine Suggestions (`ai-fine-suggestions.test.ts`)

**Coverage**: AI-powered fine suggestion generation (Genkit + Gemini)

#### Test Scenarios:
- ✅ Generate suggestions from description
- ✅ Single player suggestions
- ✅ Multiple player suggestions
- ✅ Empty suggestions handling
- ✅ Empty description rejection
- ✅ AI API failure handling
- ✅ Match AI suggestions with static players
- ✅ Filter non-matching player names
- ✅ Parse various reason formats

**Key Tests:**
```typescript
it('should generate fine suggestions from description', async () => {
  // Given: "John and Mike were late to practice"
  // When: Requesting AI suggestion
  // Then: suggestedReason="Late to practice", players=["John", "Mike"]
});

it('should handle AI API failures gracefully', async () => {
  // Given: AI API error
  // When: Requesting suggestion
  // Then: Return user-friendly error message
});
```

**Note**: AI tests use mocked responses to avoid actual API calls during testing.

### 6. Real-time Sync (`real-time-sync.test.ts`)

**Coverage**: Firestore snapshot listeners and data synchronization

#### Test Scenarios:
- ✅ Receive updates when player is added
- ✅ Receive updates when player is modified
- ✅ Receive updates when document is deleted
- ✅ Nested collection listeners (fines)
- ✅ Multiple simultaneous listeners
- ✅ Stop receiving updates after unsubscribe
- ✅ Handle listener errors gracefully

**Key Tests:**
```typescript
it('should receive real-time updates when player is added', async () => {
  // Given: Listening to players collection
  // When: New player added
  // Then: Listener callback triggered with new data
});

it('should stop receiving updates after unsubscribe', async () => {
  // Given: Active listener
  // When: Unsubscribe called, then data modified
  // Then: Callback not triggered after unsubscribe
});
```

## Test Utilities

### Seed Data Helpers (`helpers/seed-data.ts`)

Utilities for populating Firestore with test data:

```typescript
// Seed single player
await seedPlayer(firestore, player);

// Seed multiple players
await seedPlayers(firestore, [player1, player2]);

// Seed fine in user subcollection
await seedFine(firestore, userId, fine);

// Clear all test data
await clearAllTestData(firestore);
```

### Test Builders (`helpers/test-builders.ts`)

Builder pattern for creating realistic test data:

```typescript
// Build player with fluent API
const player = createPlayer()
  .withName('John Doe')
  .withEmail('john@example.com')
  .withBalance(50)
  .build();

// Build fine with auto-payment
const fine = createFine(userId)
  .withReason('Late to practice')
  .withAmount(10)
  .partiallyPaid(3)
  .build();

// Build payment
const payment = createPayment(userId)
  .withReason('Season membership')
  .withAmount(100)
  .build();

// Build due payment
const duePayment = createDuePayment(dueId, userId, userName)
  .withAmount(50)
  .exempt()
  .build();
```

## Critical User Journeys Covered

### 1. New Player Onboarding
```
Create Player → Add Season Due → Apply Payment → Calculate Balance
```
**Tests**: `player-workflows.test.ts` + `dues-management.test.ts`

### 2. Fine Management
```
Player Commits Offense → AI Suggests Fine → Create Fine with Auto-Payment → Update Balance
```
**Tests**: `ai-fine-suggestions.test.ts` + `transaction-workflows.test.ts`

### 3. CSV Data Migration
```
Export Old System Data → Import Dues CSV → Import Punishments CSV → Import Transactions CSV → Verify Balance
```
**Tests**: `csv-import.test.ts`

### 4. Payment Processing
```
Player Makes Payment → Create Credit → Auto-Apply to Unpaid Fines → Recalculate Balance
```
**Tests**: `transaction-workflows.test.ts` + `dues-management.test.ts`

### 5. Real-time Dashboard Updates
```
Admin Opens Dashboard → Subscribe to Changes → Create/Update/Delete Data → Dashboard Auto-Updates
```
**Tests**: `real-time-sync.test.ts`

## Test Workflow Diagrams

### CSV Import Workflow
```
┌─────────────────┐
│  CSV File       │
│  (Dues/Fines)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse CSV      │
│  Strip BOM      │
│  Validate Data  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Find/Create    │
│  Players        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Records │
│  (Fines/Dues)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Batch Write    │
│  to Firestore   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Verify Result  │
│  Check Counts   │
└─────────────────┘
```

### Fine Auto-Payment Workflow
```
┌──────────────────┐
│  Create Fine     │
│  Amount: €10     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Check Player    │
│  Balance         │
└────────┬─────────┘
         │
         ├─ Balance ≥ €10 ────► Mark as PAID (amountPaid=€10)
         │
         ├─ €0 < Balance < €10 ─► PARTIAL (amountPaid=balance)
         │
         └─ Balance ≤ €0 ──────► UNPAID (amountPaid=undefined)
```

### Real-time Sync Workflow
```
┌──────────────────┐
│  Client Opens    │
│  Dashboard       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Subscribe to    │
│  onSnapshot()    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Initial Data    │────►│  Render UI       │
│  Callback        │     └──────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Data Changes    │────►│  Auto-Update UI  │
│  in Firestore    │     └──────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Unsubscribe on  │
│  Component       │
│  Unmount         │
└──────────────────┘
```

## Performance Characteristics

### Test Execution Times (Approximate)

- **Player Workflows**: ~2-3 seconds
- **Transaction Workflows**: ~3-4 seconds
- **CSV Import**: ~5-8 seconds (including large batch test)
- **Dues Management**: ~3-4 seconds
- **AI Suggestions**: ~1-2 seconds (mocked)
- **Real-time Sync**: ~4-6 seconds (async listeners)

**Total Suite Runtime**: ~20-30 seconds

### Firestore Operations

- **Batch Writes**: Automatically batched (500 docs/batch)
- **Transaction Integrity**: Fully tested with rollback scenarios
- **Concurrent Operations**: Tested with parallel requests

## Troubleshooting

### Emulator Not Starting

```bash
# Check if port is already in use
lsof -i :8080

# Kill existing process
kill -9 <PID>

# Restart emulator
firebase emulators:start --only firestore,auth
```

### Tests Timing Out

- **Cause**: Emulator not running or connection issues
- **Solution**: Verify emulator is running at http://127.0.0.1:8080

### Java Not Found Error

```bash
# Install Java (required for Firestore Emulator)
# macOS:
brew install openjdk@11

# Linux (Ubuntu/Debian):
sudo apt-get install openjdk-11-jdk
```

### Tests Failing Intermittently

- **Cause**: Race conditions or cleanup issues
- **Solution**: Ensure `clearCollection()` is called in `beforeEach`

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'

      - name: Install dependencies
        run: npm ci

      - name: Install Firebase Tools
        run: npm install -g firebase-tools

      - name: Run integration tests
        run: ./scripts/test-integration.sh
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Clean up Firestore data in `beforeEach`
- Avoid shared state between tests

### 2. Use Builders

```typescript
// ✅ Good: Use builders for flexibility
const player = createPlayer()
  .withName('Test')
  .withBalance(50)
  .build();

// ❌ Bad: Hardcoded objects
const player = { id: '1', name: 'Test', balance: 50, ... };
```

### 3. Given-When-Then Pattern

```typescript
it('should calculate balance correctly', async () => {
  // Given: Initial state
  const player = createPlayer().withName('John').build();
  await seedPlayer(firestore, player);

  // When: Performing action
  const result = await service.calculateBalance(player.id);

  // Then: Verify outcome
  expect(result).toBe(100);
});
```

### 4. Async Test Handling

```typescript
// ✅ Good: Return Promise for async listeners
it('should receive updates', async () => {
  return new Promise<void>((resolve, reject) => {
    const unsubscribe = onSnapshot(query, (snapshot) => {
      // assertions
      unsubscribe();
      resolve();
    });
  });
});
```

### 5. Cleanup Listeners

```typescript
// Always unsubscribe from listeners
const unsubscribe = onSnapshot(query, callback);
// ... test logic ...
unsubscribe(); // Prevent memory leaks
```

## Coverage Goals

- **Integration Test Coverage**: 100% of critical user journeys
- **Service Layer Integration**: 100% of CRUD operations
- **CSV Import**: 100% of import scenarios
- **Real-time Sync**: 100% of listener patterns

## Future Enhancements

### Planned Test Additions

1. **Authentication Flow Integration**
   - User login/logout with Auth Emulator
   - Permission-based access control

2. **Performance Tests**
   - Large dataset handling (1000+ players)
   - Concurrent user simulations
   - Query optimization validation

3. **Error Recovery Tests**
   - Network disconnection scenarios
   - Emulator restart during operations
   - Partial batch write failures

4. **Cross-Browser Real-time Sync**
   - Multi-tab synchronization
   - Offline mode with cache

## Maintenance

### Updating Tests

When adding new features:

1. Add test cases to appropriate suite
2. Update builders if new fields added
3. Document new test scenarios
4. Update coverage report

### Version Updates

- **Vitest**: Update in `package.json` and test setup
- **Firebase**: Update emulator configuration
- **Node.js**: Ensure compatibility with CI/CD

## Resources

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Vitest Documentation](https://vitest.dev/)
- [Firestore Testing Best Practices](https://firebase.google.com/docs/firestore/security/test-rules-emulator)

---

**Last Updated**: November 13, 2025
**Test Framework**: Vitest 4.0.4
**Firebase SDK**: 11.9.1
**Total Integration Tests**: 90+
**Test Suites**: 7 files
**Average Runtime**: 20-30 seconds
