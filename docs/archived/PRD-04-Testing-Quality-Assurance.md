# PRD-04: Testing & Quality Assurance Strategy

**Product Requirements Document**
**Version:** 1.0
**Date:** 2025-10-27
**Owner:** QA Lead
**Status:** Ready for Implementation
**Priority:** P0 (Critical)
**Dependencies:** PRD-01, PRD-02, PRD-03

---

## 1. OVERVIEW

### 1.1 Purpose
Establish a comprehensive testing strategy and quality assurance framework for the Firebase migration, ensuring data integrity, preventing regressions, and maintaining high code quality throughout the migration process.

### 1.2 Background
**CRITICAL FINDING:** The codebase currently has **ZERO test coverage**. No test files exist, no test configuration is set up, and no test scripts are defined. This presents a **HIGH RISK** for the Firebase migration.

### 1.3 Success Criteria
- ✅ Test framework configured and operational
- ✅ >80% code coverage for business logic
- ✅ 100% coverage for balance calculations
- ✅ All Firebase operations tested
- ✅ Security rules validated with tests
- ✅ E2E tests for critical user flows
- ✅ CI/CD pipeline with automated testing

---

## 2. TEST FRAMEWORK SETUP

### 2.1 Testing Stack Selection

**Recommended Stack:**
- **Unit/Integration Tests:** Vitest (Next.js native support)
- **React Component Tests:** React Testing Library
- **E2E Tests:** Playwright
- **Security Rules Tests:** @firebase/rules-unit-testing
- **Mocking:** vitest-mock-extended
- **Coverage:** vitest coverage (c8)

**Rationale:**
- Vitest: Built-in Next.js 15 support, fast, compatible with Jest APIs
- React Testing Library: Industry standard, focuses on user behavior
- Playwright: Modern, reliable, cross-browser support
- Firebase Rules Testing: Official Firebase testing library

### 2.2 Installation & Configuration

**Install Dependencies:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event vitest-mock-extended @vitest/coverage-v8 \
  playwright @playwright/test @firebase/rules-unit-testing \
  happy-dom
```

**Vitest Configuration:**

**File:** `/Users/private/projects/studio/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.{ts,js}',
        '**/types.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Test Setup File:**

**File:** `/Users/private/projects/studio/tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  // ... more mocks as needed
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInAnonymously: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock Next.js
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

**Playwright Configuration:**

**File:** `/Users/private/projects/studio/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Update package.json:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:rules": "node tests/firestore-rules/run-tests.js"
  }
}
```

**Action Items:**
- [ ] Install all testing dependencies
- [ ] Create vitest.config.ts
- [ ] Create playwright.config.ts
- [ ] Create tests/setup.ts
- [ ] Update package.json scripts
- [ ] Verify test commands work

---

## 3. UNIT TESTING REQUIREMENTS

### 3.1 Balance Calculation Tests (CRITICAL)

**File:** `/Users/private/projects/studio/tests/unit/balance.service.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { BalanceService } from '@/services/balance.service';
import { Player, Fine, Payment, DuePayment, BeverageConsumption } from '@/lib/types';

describe('BalanceService', () => {
  describe('calculatePlayerBalance', () => {
    const playerId = 'player-1';

    test('should return 0 for new player with no transactions', () => {
      const balance = BalanceService.calculatePlayerBalance(playerId, [], [], [], []);
      expect(balance).toBe(0);
    });

    test('should calculate positive balance from payments only', () => {
      const payments: Payment[] = [
        {
          id: '1',
          userId: playerId,
          amount: 50,
          paid: true,
          reason: 'Deposit',
          date: '2025-01-01',
          paidAt: '2025-01-01',
        },
        {
          id: '2',
          userId: playerId,
          amount: 30,
          paid: true,
          reason: 'Deposit',
          date: '2025-01-02',
          paidAt: '2025-01-02',
        },
      ];

      const balance = BalanceService.calculatePlayerBalance(playerId, payments, [], [], []);
      expect(balance).toBe(80);
    });

    test('should calculate negative balance from fines', () => {
      const payments: Payment[] = [
        { id: '1', userId: playerId, amount: 50, paid: true, reason: 'Deposit', date: '2025-01-01', paidAt: '2025-01-01' },
      ];

      const fines: Fine[] = [
        {
          id: '1',
          userId: playerId,
          amount: 60,
          paid: false,
          reason: 'Late',
          date: '2025-01-05',
          createdAt: '2025-01-05',
          updatedAt: '2025-01-05',
        },
      ];

      const balance = BalanceService.calculatePlayerBalance(playerId, payments, fines, [], []);
      expect(balance).toBe(-10); // 50 - 60
    });

    test('should handle partial payments correctly', () => {
      const payments: Payment[] = [
        { id: '1', userId: playerId, amount: 50, paid: true, reason: 'Deposit', date: '2025-01-01', paidAt: '2025-01-01' },
      ];

      const fines: Fine[] = [
        {
          id: '1',
          userId: playerId,
          amount: 10,
          paid: false,
          amountPaid: 3, // Paid 3 out of 10
          reason: 'Late',
          date: '2025-01-05',
          createdAt: '2025-01-05',
          updatedAt: '2025-01-05',
        },
      ];

      const balance = BalanceService.calculatePlayerBalance(playerId, payments, fines, [], []);
      expect(balance).toBe(43); // 50 - (10 - 3) = 50 - 7
    });

    test('should ignore paid fines in calculation', () => {
      const payments: Payment[] = [
        { id: '1', userId: playerId, amount: 50, paid: true, reason: 'Deposit', date: '2025-01-01', paidAt: '2025-01-01' },
      ];

      const fines: Fine[] = [
        {
          id: '1',
          userId: playerId,
          amount: 10,
          paid: true, // Already paid
          amountPaid: 10,
          reason: 'Late',
          date: '2025-01-05',
          paidAt: '2025-01-06',
          createdAt: '2025-01-05',
          updatedAt: '2025-01-06',
        },
      ];

      const balance = BalanceService.calculatePlayerBalance(playerId, payments, fines, [], []);
      expect(balance).toBe(50); // Fine doesn't affect balance since it's paid
    });

    test('should handle exempt dues correctly', () => {
      const payments: Payment[] = [
        { id: '1', userId: playerId, amount: 50, paid: true, reason: 'Deposit', date: '2025-01-01', paidAt: '2025-01-01' },
      ];

      const duePayments: DuePayment[] = [
        {
          id: '1',
          dueId: 'due-1',
          userId: playerId,
          userName: 'John Doe',
          amountDue: 20,
          paid: false,
          exempt: true, // Player is exempt
          createdAt: '2025-01-01',
        },
      ];

      const balance = BalanceService.calculatePlayerBalance(playerId, payments, [], duePayments, []);
      expect(balance).toBe(50); // Exempt due doesn't affect balance
    });

    test('should calculate complex scenario with multiple transaction types', () => {
      const payments: Payment[] = [
        { id: '1', userId: playerId, amount: 100, paid: true, reason: 'Deposit', date: '2025-01-01', paidAt: '2025-01-01' },
      ];

      const fines: Fine[] = [
        {
          id: '1',
          userId: playerId,
          amount: 10,
          paid: false,
          amountPaid: 3,
          reason: 'Late',
          date: '2025-01-05',
          createdAt: '2025-01-05',
          updatedAt: '2025-01-05',
        },
      ];

      const duePayments: DuePayment[] = [
        {
          id: '1',
          dueId: 'due-1',
          userId: playerId,
          userName: 'John Doe',
          amountDue: 50,
          paid: false,
          exempt: false,
          createdAt: '2025-01-01',
        },
      ];

      const beverageConsumptions: BeverageConsumption[] = [
        {
          id: '1',
          userId: playerId,
          beverageId: 'bev-1',
          beverageName: 'Beer',
          amount: 5,
          paid: false,
          date: '2025-01-10',
          createdAt: '2025-01-10',
        },
      ];

      // Balance = 100 (payment) - 7 (fine: 10-3) - 50 (due) - 5 (beverage)
      const balance = BalanceService.calculatePlayerBalance(
        playerId,
        payments,
        fines,
        duePayments,
        beverageConsumptions
      );

      expect(balance).toBe(38);
    });
  });

  describe('getPaymentStatus', () => {
    test('should return "paid" when paid flag is true', () => {
      const status = BalanceService.getPaymentStatus(10, 10, true);
      expect(status).toBe('paid');
    });

    test('should return "unpaid" when no amount paid', () => {
      const status = BalanceService.getPaymentStatus(10, 0, false);
      expect(status).toBe('unpaid');
    });

    test('should return "unpaid" when amountPaid is undefined', () => {
      const status = BalanceService.getPaymentStatus(10, undefined, false);
      expect(status).toBe('unpaid');
    });

    test('should return "partially_paid" when partially paid', () => {
      const status = BalanceService.getPaymentStatus(10, 3, false);
      expect(status).toBe('partially_paid');
    });
  });
});
```

**Coverage Target:** 100% (CRITICAL)

**Action Items:**
- [ ] Write comprehensive balance calculation tests
- [ ] Test all edge cases (partial payments, exempt dues, etc.)
- [ ] Achieve 100% coverage for BalanceService
- [ ] Verify calculations match expected values

---

### 3.2 Service Layer Tests

**File:** `/Users/private/projects/studio/tests/unit/players.service.test.ts`

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PlayersService } from '@/services/players.service';
import { Firestore } from 'firebase/firestore';

describe('PlayersService', () => {
  let service: PlayersService;
  let mockFirestore: Firestore;

  beforeEach(() => {
    mockFirestore = {} as Firestore;
    service = new PlayersService(mockFirestore);
  });

  describe('createPlayer', () => {
    test('should create player with correct initial values', async () => {
      const playerData = {
        name: 'John Doe',
        nickname: 'JD',
        photoUrl: 'https://example.com/photo.jpg',
      };

      // Mock setDoc
      const mockSetDoc = vi.fn();
      vi.spyOn(service as any, 'setDocumentNonBlocking').mockImplementation(mockSetDoc);

      await service.createPlayer(playerData);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ...playerData,
          totalUnpaidPenalties: 0,
          totalPaidPenalties: 0,
          balance: 0,
        })
      );
    });
  });

  describe('updatePlayer', () => {
    test('should call updateDoc with correct parameters', async () => {
      const mockUpdateDoc = vi.fn();
      vi.spyOn(service as any, 'updateDocumentNonBlocking').mockImplementation(mockUpdateDoc);

      const updates = { nickname: 'New Nickname' };
      await service.updatePlayer('player-123', updates);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        updates
      );
    });
  });
});
```

**Similar tests needed for:**
- [ ] FinesService (especially auto-payment logic)
- [ ] PaymentsService
- [ ] DuesService
- [ ] BeveragesService

---

### 3.3 Utility Function Tests

**File:** `/Users/private/projects/studio/tests/unit/utils.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { cn, formatCurrency, formatDate, centsToEUR } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    test('should format positive numbers correctly', () => {
      expect(formatCurrency(50.5)).toBe('€50.50');
      expect(formatCurrency(100)).toBe('€100.00');
    });

    test('should format negative numbers correctly', () => {
      expect(formatCurrency(-10.5)).toBe('-€10.50');
    });

    test('should handle zero', () => {
      expect(formatCurrency(0)).toBe('€0.00');
    });
  });

  describe('centsToEUR', () => {
    test('should convert cents to EUR correctly', () => {
      expect(centsToEUR(5000)).toBe(50.00);
      expect(centsToEUR(150)).toBe(1.50);
      expect(centsToEUR(0)).toBe(0);
    });
  });
});
```

**Action Items:**
- [ ] Test all utility functions in `/src/lib/utils.ts`
- [ ] Test CSV parsing functions
- [ ] Test date formatting functions
- [ ] Test currency formatting functions

---

## 4. INTEGRATION TESTING REQUIREMENTS

### 4.1 Firebase Hook Tests

**File:** `/Users/private/projects/studio/tests/integration/firebase-hooks.test.tsx`

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlayers } from '@/services/players.service';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firebase Hooks Integration', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: {
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('usePlayers', () => {
    test('should return empty array initially', async () => {
      const { result } = renderHook(() => usePlayers(), {
        wrapper: ({ children }) => (
          <FirebaseProvider>{children}</FirebaseProvider>
        ),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual([]);
    });

    test('should return players after adding to Firestore', async () => {
      // Add player to test Firestore
      const db = testEnv.authenticatedContext('user1').firestore();
      await db.collection('users').add({
        name: 'Test Player',
        nickname: 'TP',
        photoUrl: 'https://example.com/test.jpg',
      });

      const { result } = renderHook(() => usePlayers(), {
        wrapper: ({ children }) => (
          <FirebaseProvider>{children}</FirebaseProvider>
        ),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await waitFor(() => expect(result.current.data?.length).toBeGreaterThan(0));

      expect(result.current.data?.[0].name).toBe('Test Player');
    });
  });
});
```

**Action Items:**
- [ ] Set up Firebase emulator for integration tests
- [ ] Test all Firebase hooks with real Firestore
- [ ] Test real-time updates
- [ ] Test error scenarios (permission denied, network errors)

---

### 4.2 Component Integration Tests

**File:** `/Users/private/projects/studio/tests/integration/players-page.test.tsx`

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayersPage from '@/app/(app)/players/page';
import { FirebaseProvider } from '@/firebase/provider';

describe('PlayersPage Integration', () => {
  beforeEach(async () => {
    // Clear Firestore emulator data
    await clearFirestoreData();
  });

  test('should add player and display in list', async () => {
    render(
      <FirebaseProvider>
        <PlayersPage />
      </FirebaseProvider>
    );

    // Wait for page to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Click add player button
    await userEvent.click(screen.getByText('Add Player'));

    // Fill form
    await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
    await userEvent.type(screen.getByLabelText('Nickname'), 'JD');
    await userEvent.type(
      screen.getByLabelText('Photo URL'),
      'https://example.com/photo.jpg'
    );

    // Submit
    await userEvent.click(screen.getByText('Save'));

    // Wait for success toast
    await waitFor(() => {
      expect(screen.getByText(/Player Added/i)).toBeInTheDocument();
    });

    // Verify player appears in list
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  test('should update player', async () => {
    // Pre-populate with a player
    await addTestPlayer({ name: 'John Doe', nickname: 'JD' });

    render(
      <FirebaseProvider>
        <PlayersPage />
      </FirebaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click edit button
    await userEvent.click(screen.getByTestId('edit-player-button'));

    // Update nickname
    const nicknameInput = screen.getByLabelText('Nickname');
    await userEvent.clear(nicknameInput);
    await userEvent.type(nicknameInput, 'Johnny');

    // Submit
    await userEvent.click(screen.getByText('Save'));

    // Verify updated nickname
    await waitFor(() => {
      expect(screen.getByText('Johnny')).toBeInTheDocument();
    });
  });
});
```

**Action Items:**
- [ ] Test all pages with Firebase emulator
- [ ] Test CRUD operations end-to-end
- [ ] Test error scenarios
- [ ] Test loading states

---

## 5. FIRESTORE SECURITY RULES TESTING

### 5.1 Security Rules Test Setup

**File:** `/Users/private/projects/studio/tests/firestore-rules/setup.ts`

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';

let testEnv: RulesTestEnvironment;

export async function setupTestEnvironment() {
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules: fs.readFileSync(
        path.resolve(__dirname, '../../firestore.rules'),
        'utf8'
      ),
      host: 'localhost',
      port: 8080,
    },
  });

  return testEnv;
}

export function getTestEnv() {
  return testEnv;
}

export async function teardownTestEnvironment() {
  await testEnv.cleanup();
}
```

### 5.2 Security Rules Tests

**File:** `/Users/private/projects/studio/tests/firestore-rules/security-rules.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { setupTestEnvironment, teardownTestEnvironment, getTestEnv } from './setup';

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    const testEnv = getTestEnv();
    await testEnv.clearFirestore();
  });

  describe('User Profiles (Players)', () => {
    test('authenticated user can read all players', async () => {
      const testEnv = getTestEnv();
      const db = testEnv.authenticatedContext('user1').firestore();

      await assertSucceeds(getDocs(collection(db, 'users')));
    });

    test('unauthenticated user cannot read players', async () => {
      const testEnv = getTestEnv();
      const db = testEnv.unauthenticatedContext().firestore();

      await assertFails(getDocs(collection(db, 'users')));
    });

    test('user can update their own profile', async () => {
      const testEnv = getTestEnv();
      const db = testEnv.authenticatedContext('user1').firestore();

      await assertSucceeds(
        setDoc(doc(db, 'users/user1'), {
          name: 'John Doe',
          nickname: 'JD',
        })
      );
    });

    test('user cannot update another user profile', async () => {
      const testEnv = getTestEnv();
      const db = testEnv.authenticatedContext('user1').firestore();

      await assertFails(
        setDoc(doc(db, 'users/user2'), {
          name: 'Jane Doe',
          nickname: 'JD',
        })
      );
    });
  });

  describe('Fines (Penalties)', () => {
    test('authenticated user can read all fines', async () => {
      const testEnv = getTestEnv();
      const db = testEnv.authenticatedContext('user1').firestore();

      await assertSucceeds(
        getDocs(collection(db, 'users/user1/fines'))
      );
    });

    test('only admin can create fines', async () => {
      const testEnv = getTestEnv();

      // Non-admin user
      const userDb = testEnv.authenticatedContext('user1').firestore();
      await assertFails(
        setDoc(doc(userDb, 'users/user1/fines/fine1'), {
          amount: 5,
          reason: 'Late',
        })
      );

      // Admin user (requires admin in /admins collection)
      const adminDb = testEnv.authenticatedContext('admin1').firestore();

      // First, set up admin
      await testEnv
        .withSecurityRulesDisabled(async (context) => {
          const db = context.firestore();
          await setDoc(doc(db, 'admins/admin1'), { role: 'admin' });
        });

      // Now admin should be able to create fines
      await assertSucceeds(
        setDoc(doc(adminDb, 'users/user1/fines/fine1'), {
          amount: 5,
          reason: 'Late',
        })
      );
    });
  });

  describe('Predefined Fines', () => {
    test('authenticated user can read predefined fines', async () => {
      const testEnv = getTestEnv();
      const db = testEnv.authenticatedContext('user1').firestore();

      await assertSucceeds(getDocs(collection(db, 'predefinedFines')));
    });

    test('non-admin cannot create predefined fines', async () => {
      const testEnv = getTestEnv();
      const db = testEnv.authenticatedContext('user1').firestore();

      await assertFails(
        setDoc(doc(db, 'predefinedFines/fine1'), {
          reason: 'Late',
          amount: 5,
        })
      );
    });
  });
});
```

**Action Items:**
- [ ] Test all security rule scenarios
- [ ] Test read permissions for all collections
- [ ] Test write permissions for all collections
- [ ] Test admin role functionality
- [ ] Achieve 100% security rule coverage

---

## 6. E2E TESTING REQUIREMENTS

### 6.1 Critical User Flows

**File:** `/Users/private/projects/studio/tests/e2e/critical-flows.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Wait for Firebase initialization
    await page.waitForLoadState('networkidle');
  });

  test('should add fine with auto-payment from credit balance', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="player-grid"]');

    // Get player's initial balance
    const initialBalanceText = await page.textContent('[data-testid="player-1-balance"]');
    const initialBalance = parseFloat(initialBalanceText?.replace(/[^0-9.-]/g, '') || '0');

    // Open add fine dialog
    await page.click('[data-testid="add-fine-button"]');

    // Fill fine form
    await page.selectOption('[data-testid="player-select"]', 'player-1');
    await page.fill('[data-testid="fine-amount"]', '5');
    await page.fill('[data-testid="fine-reason"]', 'Late to practice');

    // Submit
    await page.click('[data-testid="submit-fine"]');

    // Wait for success toast
    await page.waitForSelector('text=Fine Added');

    // Verify balance updated (should decrease by 5 if player had credit)
    await page.waitForFunction(
      (args) => {
        const element = document.querySelector(args.selector);
        const newBalanceText = element?.textContent || '0';
        const newBalance = parseFloat(newBalanceText.replace(/[^0-9.-]/g, ''));
        return Math.abs(newBalance - (args.expected)) < 0.01; // Allow for rounding
      },
      {
        selector: '[data-testid="player-1-balance"]',
        expected: initialBalance - 5,
      }
    );
  });

  test('should record payment and update balance in real-time', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForSelector('[data-testid="player-grid"]');

    // Get initial balance
    const initialBalanceText = await page.textContent('[data-testid="player-1-balance"]');
    const initialBalance = parseFloat(initialBalanceText?.replace(/[^0-9.-]/g, '') || '0');

    // Click add payment button
    await page.click('[data-testid="add-payment-button"]');

    // Fill payment form
    await page.selectOption('[data-testid="player-select"]', 'player-1');
    await page.fill('[data-testid="payment-amount"]', '50');
    await page.fill('[data-testid="payment-reason"]', 'Deposit');

    // Submit
    await page.click('[data-testid="submit-payment"]');

    // Wait for success
    await page.waitForSelector('text=Payment Added');

    // Verify balance increased by 50
    await page.waitForFunction(
      (args) => {
        const element = document.querySelector(args.selector);
        const newBalanceText = element?.textContent || '0';
        const newBalance = parseFloat(newBalanceText.replace(/[^0-9.-]/g, ''));
        return Math.abs(newBalance - args.expected) < 0.01;
      },
      {
        selector: '[data-testid="player-1-balance"]',
        expected: initialBalance + 50,
      }
    );
  });

  test('should toggle transaction status', async ({ page }) => {
    await page.goto('/money');

    await page.waitForSelector('[data-testid="transaction-list"]');

    // Find first unpaid transaction
    const unpaidTransaction = page.locator('[data-testid^="transaction-"][data-status="unpaid"]').first();

    // Click status badge to toggle
    await unpaidTransaction.locator('[data-testid="status-badge"]').click();

    // Wait for status to change
    await page.waitForSelector('[data-testid^="transaction-"][data-status="paid"]');

    // Verify status changed
    const status = await unpaidTransaction.getAttribute('data-status');
    expect(status).toBe('paid');
  });

  test('should import CSV dues successfully', async ({ page }) => {
    await page.goto('/settings');

    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/dues-sample.csv');

    // Click import button
    await page.click('[data-testid="import-dues-button"]');

    // Wait for success message
    await page.waitForSelector('text=Successfully imported');

    // Navigate to dashboard to verify data
    await page.goto('/dashboard');

    // Verify dues appear in the list
    // (specific verification depends on CSV content)
  });

  test('should work offline and sync when online', async ({ page, context }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="player-grid"]');

    // Go offline
    await context.setOffline(true);

    // Verify offline indicator appears
    await page.waitForSelector('[data-testid="offline-indicator"]');

    // Try to add a fine (should queue)
    await page.click('[data-testid="add-fine-button"]');
    await page.selectOption('[data-testid="player-select"]', 'player-1');
    await page.fill('[data-testid="fine-amount"]', '5');
    await page.fill('[data-testid="fine-reason"]', 'Offline test');
    await page.click('[data-testid="submit-fine"]');

    // Verify pending writes indicator
    await page.waitForSelector('[data-testid="pending-writes"]');

    // Go back online
    await context.setOffline(false);

    // Wait for sync
    await page.waitForSelector('[data-testid="pending-writes"]', { state: 'hidden' });

    // Verify offline indicator disappears
    await page.waitForSelector('[data-testid="offline-indicator"]', { state: 'hidden' });

    // Verify data synced
    await page.waitForSelector('text=Offline test');
  });
});
```

**Action Items:**
- [ ] Write E2E tests for all critical flows
- [ ] Test offline behavior
- [ ] Test error recovery
- [ ] Test across different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile viewports

---

## 7. CONTINUOUS INTEGRATION SETUP

### 7.1 GitHub Actions Workflow

**File:** `/Users/private/projects/studio/.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests

  security-rules-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start Firebase Emulator
        run: |
          npm install -g firebase-tools
          firebase emulators:start --only firestore &
          sleep 10

      - name: Run security rules tests
        run: npm run test:rules

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start Firebase Emulator
        run: |
          npm install -g firebase-tools
          firebase emulators:start --only firestore &
          sleep 10

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npm run type-check
```

**Action Items:**
- [ ] Create GitHub Actions workflow
- [ ] Set up Codecov for coverage reporting
- [ ] Configure Firebase emulator in CI
- [ ] Add status badges to README

---

## 8. TEST DATA & FIXTURES

### 8.1 Test Data Generators

**File:** `/Users/private/projects/studio/tests/fixtures/generators.ts`

```typescript
import { Player, Fine, Payment } from '@/lib/types';

export function generatePlayer(overrides?: Partial<Player>): Player {
  const id = overrides?.id || `player-${Date.now()}`;

  return {
    id,
    name: overrides?.name || 'Test Player',
    nickname: overrides?.nickname || 'TP',
    photoUrl: overrides?.photoUrl || 'https://example.com/photo.jpg',
    balance: overrides?.balance || 0,
    totalUnpaidPenalties: overrides?.totalUnpaidPenalties || 0,
    totalPaidPenalties: overrides?.totalPaidPenalties || 0,
    email: overrides?.email,
    phone: overrides?.phone,
  };
}

export function generateFine(overrides?: Partial<Fine>): Fine {
  return {
    id: overrides?.id || `fine-${Date.now()}`,
    userId: overrides?.userId || 'player-1',
    reason: overrides?.reason || 'Test fine',
    amount: overrides?.amount || 5,
    date: overrides?.date || new Date().toISOString(),
    paid: overrides?.paid || false,
    paidAt: overrides?.paidAt,
    amountPaid: overrides?.amountPaid,
    createdAt: overrides?.createdAt || new Date().toISOString(),
    updatedAt: overrides?.updatedAt || new Date().toISOString(),
  };
}

export function generatePayment(overrides?: Partial<Payment>): Payment {
  return {
    id: overrides?.id || `payment-${Date.now()}`,
    userId: overrides?.userId || 'player-1',
    reason: overrides?.reason || 'Test payment',
    amount: overrides?.amount || 50,
    date: overrides?.date || new Date().toISOString(),
    paid: true,
    paidAt: overrides?.paidAt || new Date().toISOString(),
  };
}
```

### 8.2 CSV Test Fixtures

**File:** `/Users/private/projects/studio/tests/fixtures/dues-sample.csv`

```csv
Datum;Beitrag;Name;Betrag;Gekommen;Offen
15-01-2025;Saison2526;John Doe;50;0;50
15-01-2025;Saison2526;Jane Smith;50;0;50
15-01-2025;Meistershi;John Doe;30;0;30
```

**Action Items:**
- [ ] Create test data generators
- [ ] Create CSV test fixtures
- [ ] Create mock Firebase data for integration tests

---

## 9. IMPLEMENTATION PLAN

### Phase 1: Test Infrastructure (Week 1)
**Tasks:**
- [ ] Install testing dependencies
- [ ] Configure Vitest and Playwright
- [ ] Set up Firebase emulator
- [ ] Create test setup files
- [ ] Configure CI/CD pipeline

**Deliverables:**
- ✅ Working test infrastructure
- ✅ CI/CD pipeline operational

### Phase 2: Critical Logic Tests (Week 2)
**Tasks:**
- [ ] Write balance calculation tests (100% coverage)
- [ ] Write service layer tests
- [ ] Write utility function tests
- [ ] Achieve 80% overall coverage

**Deliverables:**
- ✅ 100% balance calculation coverage
- ✅ >80% service layer coverage

### Phase 3: Integration Tests (Week 3)
**Tasks:**
- [ ] Write Firebase hook tests
- [ ] Write component integration tests
- [ ] Write security rules tests
- [ ] Test with Firebase emulator

**Deliverables:**
- ✅ All hooks tested
- ✅ 100% security rules coverage

### Phase 4: E2E Tests (Week 4)
**Tasks:**
- [ ] Write E2E tests for critical flows
- [ ] Test offline behavior
- [ ] Cross-browser testing
- [ ] Performance testing

**Deliverables:**
- ✅ All critical flows tested
- ✅ Cross-browser compatibility verified

---

## 10. SUCCESS METRICS

### 10.1 Coverage Metrics
- **Balance Calculation:** 100% coverage (CRITICAL)
- **Service Layer:** >80% coverage
- **Components:** >70% coverage
- **Overall:** >80% coverage
- **Security Rules:** 100% scenarios covered

### 10.2 Quality Metrics
- **Test Pass Rate:** 100% on main branch
- **CI/CD Success Rate:** >95%
- **Flaky Test Rate:** <1%
- **Test Execution Time:** <5 minutes for unit tests, <10 minutes for E2E

---

**Document Status:** Ready for Implementation
**Approval Required:** QA Lead, Technical Lead
**Next PRD:** PRD-05-Performance-Optimization.md