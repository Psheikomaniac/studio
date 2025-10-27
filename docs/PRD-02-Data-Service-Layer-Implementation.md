# PRD-02: Data Service Layer Implementation

**Product Requirements Document**
**Version:** 1.0
**Date:** 2025-10-27
**Owner:** Backend Team Lead
**Status:** Ready for Implementation
**Priority:** P0 (Critical)
**Dependencies:** PRD-01 (Firebase Infrastructure Setup)

---

## 1. OVERVIEW

### 1.1 Purpose
Create a comprehensive service layer that abstracts Firestore operations and provides type-safe, reusable data access methods for all entities in the balanceUp application (Players, Fines, Payments, Dues, Beverages).

### 1.2 Background
The application currently uses static data with direct component state manipulation. This PRD defines the service layer that will replace static data imports with Firebase Firestore queries while maintaining the existing data models and business logic.

### 1.3 Success Criteria
- ✅ All data entities have dedicated service classes
- ✅ Type-safe data access methods with full TypeScript support
- ✅ Real-time data synchronization using Firestore hooks
- ✅ Consistent error handling across all services
- ✅ Balance calculation logic integrated with service layer
- ✅ Support for complex queries (filtering, sorting, pagination)

---

## 2. OBJECTIVES

### 2.1 Primary Objectives
1. **Service Classes**: Create service classes for Players, Fines, Payments, Dues, Beverages
2. **CRUD Operations**: Implement Create, Read, Update, Delete for all entities
3. **Real-time Hooks**: Provide React hooks for real-time data access
4. **Query Builders**: Support complex filtering and sorting
5. **Balance Calculation**: Integrate existing balance calculation logic
6. **Type Safety**: Ensure full TypeScript type coverage

### 2.2 Secondary Objectives
1. Pagination support for large datasets
2. Batch operations for bulk updates
3. Transaction support for atomic operations
4. Query result caching for performance
5. Optimistic updates for better UX

---

## 3. DATA MODELS & ENTITIES

### 3.1 Entity Overview

Based on analysis in `/src/lib/types.ts`:

| Entity | Collection Path | Subcollection | Key Relationships |
|--------|----------------|---------------|-------------------|
| **Player** | `/users/{userId}` | No | Root entity |
| **Fine** | `/users/{userId}/fines/{fineId}` | Yes (under user) | Belongs to Player |
| **Payment** | `/users/{userId}/payments/{paymentId}` | Yes (under user) | Belongs to Player |
| **DuePayment** | `/duePayments/{paymentId}` | No | References Player & Due |
| **Due** | `/dues/{dueId}` | No | Catalog |
| **Beverage** | `/beverages/{beverageId}` | No | Catalog |
| **BeverageConsumption** | `/users/{userId}/beverages/{consumptionId}` | Yes (under user) | Belongs to Player |
| **PredefinedFine** | `/predefinedFines/{fineId}` | No | Catalog |

### 3.2 Key Business Logic

**Balance Calculation Formula** (from `/src/lib/utils.ts`):
```
Player Balance = Total Credits - Total Debits

Credits = Σ(paid payments)
Debits = Σ(unpaid fines) + Σ(unpaid dues) + Σ(unpaid beverages)

Where unpaid amount = total amount - amount paid (for partial payments)
```

**Partial Payment Support:**
- Fine/Due/Beverage can have `amountPaid < amount`
- Status: `paid` (full), `partially_paid` (partial), `unpaid` (none)

**Auto-Payment Logic:**
- When creating fines, automatically deduct from player's credit balance
- If balance >= fine amount → mark as paid
- If balance < fine amount && balance > 0 → mark as partially paid

---

## 4. SERVICE ARCHITECTURE

### 4.1 Base Service Class

**File:** `/Users/private/projects/studio/src/services/base.service.ts`

```typescript
import {
  Firestore,
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  Query,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  WhereFilterOp,
  OrderByDirection
} from 'firebase/firestore';

export interface QueryFilter {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

export interface QueryOrder {
  field: string;
  direction: OrderByDirection;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: QueryOrder;
  limit?: number;
  startAfter?: any;
}

export abstract class BaseFirebaseService<T> {
  protected firestore: Firestore;
  protected collectionPath: string;

  constructor(firestore: Firestore, collectionPath: string) {
    this.firestore = firestore;
    this.collectionPath = collectionPath;
  }

  /**
   * Get collection reference
   */
  protected getCollectionRef(): CollectionReference {
    return collection(this.firestore, this.collectionPath);
  }

  /**
   * Get document reference
   */
  protected getDocRef(id: string): DocumentReference {
    return doc(this.firestore, this.collectionPath, id);
  }

  /**
   * Build query with filters, sorting, and pagination
   */
  protected buildQuery(options?: QueryOptions): Query {
    let q: Query = this.getCollectionRef();

    if (options?.filters) {
      options.filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
    }

    if (options?.orderBy) {
      q = query(q, orderBy(options.orderBy.field, options.orderBy.direction));
    }

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    if (options?.startAfter) {
      q = query(q, startAfter(options.startAfter));
    }

    return q;
  }

  /**
   * Generate ISO timestamp
   */
  protected timestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generate unique ID with prefix
   */
  protected generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4.2 Service Interface Pattern

Each service should expose:
1. **Hooks**: React hooks for real-time data (`useX`, `useXById`)
2. **Queries**: Query builders for complex filtering (`getXQuery`)
3. **Mutations**: CRUD operations (`createX`, `updateX`, `deleteX`)
4. **Helpers**: Utility functions specific to the entity

---

## 5. DETAILED IMPLEMENTATION REQUIREMENTS

### 5.1 Players Service

**File:** `/Users/private/projects/studio/src/services/players.service.ts`

```typescript
import { Firestore, collection, doc, query, orderBy } from 'firebase/firestore';
import { useCollection, useDoc, useMemoFirebase } from '@/firebase';
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { Player } from '@/lib/types';
import { BaseFirebaseService } from './base.service';

/**
 * Service for managing player (user) data
 */
export class PlayersService extends BaseFirebaseService<Player> {
  constructor(firestore: Firestore) {
    super(firestore, 'users');
  }

  /**
   * Create a new player
   */
  async createPlayer(playerData: Omit<Player, 'id'>): Promise<void> {
    const docRef = doc(this.getCollectionRef(), playerData.id || this.generateId('player'));

    const data: Player = {
      ...playerData,
      totalUnpaidPenalties: 0,
      totalPaidPenalties: 0,
      balance: 0, // Initial balance is 0
    };

    setDocumentNonBlocking(docRef, data, { merge: false });
  }

  /**
   * Update player information
   */
  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<void> {
    const docRef = this.getDocRef(playerId);
    updateDocumentNonBlocking(docRef, updates);
  }

  /**
   * Delete a player
   */
  async deletePlayer(playerId: string): Promise<void> {
    const docRef = this.getDocRef(playerId);
    deleteDocumentNonBlocking(docRef);
  }
}

/**
 * Hook to get all players with real-time updates
 */
export function usePlayers() {
  const firestore = useFirestore();

  const playersQuery = useMemoFirebase(() =>
    query(
      collection(firestore, 'users'),
      orderBy('name', 'asc')
    ),
    [firestore]
  );

  return useCollection<Player>(playersQuery);
}

/**
 * Hook to get a single player by ID
 */
export function usePlayer(playerId: string | null) {
  const firestore = useFirestore();

  const playerDocRef = useMemoFirebase(() =>
    playerId ? doc(firestore, 'users', playerId) : null,
    [firestore, playerId]
  );

  return useDoc<Player>(playerDocRef);
}

/**
 * Hook to get PlayersService instance
 */
export function usePlayersService(): PlayersService {
  const firestore = useFirestore();
  return new PlayersService(firestore);
}
```

**Implementation Requirements:**

**Must Implement:**
- [x] `createPlayer(data)` - Create new player document
- [x] `updatePlayer(id, updates)` - Update player fields
- [x] `deletePlayer(id)` - Delete player (with validation)
- [x] `usePlayers()` - Hook for all players with real-time updates
- [x] `usePlayer(id)` - Hook for single player
- [x] `usePlayersService()` - Hook to get service instance

**Validation Rules:**
1. Cannot delete player with unpaid fines
2. Name and nickname are required
3. Email must be valid format (if provided)
4. Phone must be valid format (if provided)

**Action Items:**
- [ ] Implement PlayersService class
- [ ] Create hooks (usePlayers, usePlayer, usePlayersService)
- [ ] Add validation before delete (check for unpaid fines)
- [ ] Write unit tests for service methods
- [ ] Write integration tests for hooks
- [ ] Document service API with JSDoc

---

### 5.2 Fines Service

**File:** `/Users/private/projects/studio/src/services/fines.service.ts`

```typescript
import { Firestore, collection, doc, query, where, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Fine, Player } from '@/lib/types';
import { BaseFirebaseService } from './base.service';

/**
 * Service for managing fines (penalties)
 */
export class FinesService extends BaseFirebaseService<Fine> {
  constructor(firestore: Firestore) {
    super(firestore, 'fines'); // Note: This is a conceptual path; actual implementation uses nested collections
  }

  /**
   * Create a fine for a player with auto-payment logic
   */
  async createFine(fineData: Omit<Fine, 'id'>, playerBalance: number): Promise<void> {
    const { userId, reason, amount, date } = fineData;

    // Auto-payment logic from player credit balance
    const hasFullCredit = playerBalance >= amount;
    const hasPartialCredit = playerBalance > 0 && playerBalance < amount;

    const data: Omit<Fine, 'id'> = {
      userId,
      reason,
      amount,
      date: date || new Date().toISOString(),
      paid: hasFullCredit,
      paidAt: hasFullCredit ? new Date().toISOString() : undefined,
      amountPaid: hasPartialCredit ? playerBalance : (hasFullCredit ? amount : undefined),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to user's nested collection
    const fineRef = doc(collection(this.firestore, `users/${userId}/fines`));
    addDocumentNonBlocking(fineRef, data);
  }

  /**
   * Update fine payment status
   */
  async updateFinePayment(
    userId: string,
    fineId: string,
    amountPaid: number
  ): Promise<void> {
    const fineRef = doc(this.firestore, `users/${userId}/fines`, fineId);

    // This should ideally use a Firestore transaction to ensure atomicity
    updateDocumentNonBlocking(fineRef, {
      amountPaid,
      paid: true, // Assume full payment for now
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Toggle fine paid status
   */
  async toggleFinePaid(userId: string, fineId: string, paid: boolean): Promise<void> {
    const fineRef = doc(this.firestore, `users/${userId}/fines`, fineId);

    updateDocumentNonBlocking(fineRef, {
      paid,
      paidAt: paid ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Hook to get all fines for a specific player
 */
export function usePlayerFines(userId: string | null) {
  const firestore = useFirestore();

  const finesQuery = useMemoFirebase(() =>
    userId
      ? query(
          collection(firestore, `users/${userId}/fines`),
          orderBy('date', 'desc')
        )
      : null,
    [firestore, userId]
  );

  return useCollection<Fine>(finesQuery);
}

/**
 * Hook to get all unpaid fines across all players (for admin view)
 */
export function useUnpaidFines(limitCount = 50) {
  const firestore = useFirestore();

  // Note: This requires a collection group query
  // For now, we'll query the top-level 'fines' collection if it exists
  const unpaidFinesQuery = useMemoFirebase(() =>
    query(
      collection(firestore, 'fines'),
      where('paid', '==', false),
      orderBy('date', 'desc')
    ),
    [firestore]
  );

  return useCollection<Fine>(unpaidFinesQuery);
}

/**
 * Hook to get FinesService instance
 */
export function useFinesService(): FinesService {
  const firestore = useFirestore();
  return new FinesService(firestore);
}
```

**Implementation Requirements:**

**Must Implement:**
- [x] `createFine(data, playerBalance)` - Create fine with auto-payment logic
- [x] `updateFinePayment(userId, fineId, amount)` - Record payment
- [x] `toggleFinePaid(userId, fineId, paid)` - Toggle paid status
- [x] `usePlayerFines(userId)` - Hook for player's fines
- [x] `useUnpaidFines(limit)` - Hook for all unpaid fines
- [x] `useFinesService()` - Hook to get service instance

**Business Logic:**
1. Auto-payment from player credit when creating fine
2. Support partial payments via `amountPaid` field
3. Calculate remaining unpaid amount: `amount - (amountPaid || 0)`

**Action Items:**
- [ ] Implement FinesService class
- [ ] Implement auto-payment logic in createFine
- [ ] Create hooks (usePlayerFines, useUnpaidFines)
- [ ] Add Firestore transaction for updateFinePayment
- [ ] Write unit tests with auto-payment scenarios
- [ ] Document payment logic with examples

---

### 5.3 Payments Service

**File:** `/Users/private/projects/studio/src/services/payments.service.ts`

```typescript
import { Firestore, collection, doc, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Payment } from '@/lib/types';
import { BaseFirebaseService } from './base.service';

/**
 * Service for managing payments (credits to player accounts)
 */
export class PaymentsService extends BaseFirebaseService<Payment> {
  constructor(firestore: Firestore) {
    super(firestore, 'payments');
  }

  /**
   * Create a payment (credit) for a player
   */
  async createPayment(paymentData: Omit<Payment, 'id'>): Promise<void> {
    const { userId, reason, amount, date } = paymentData;

    const data: Omit<Payment, 'id'> = {
      userId,
      reason,
      amount,
      date: date || new Date().toISOString(),
      paid: true, // Payments are always "paid" (they are credits)
      paidAt: new Date().toISOString(),
    };

    // Add to user's nested collection
    const paymentRef = doc(collection(this.firestore, `users/${userId}/payments`));
    addDocumentNonBlocking(paymentRef, data);
  }
}

/**
 * Hook to get all payments for a specific player
 */
export function usePlayerPayments(userId: string | null) {
  const firestore = useFirestore();

  const paymentsQuery = useMemoFirebase(() =>
    userId
      ? query(
          collection(firestore, `users/${userId}/payments`),
          orderBy('date', 'desc')
        )
      : null,
    [firestore, userId]
  );

  return useCollection<Payment>(paymentsQuery);
}

/**
 * Hook to get PaymentsService instance
 */
export function usePaymentsService(): PaymentsService {
  const firestore = useFirestore();
  return new PaymentsService(firestore);
}
```

**Implementation Requirements:**

**Must Implement:**
- [x] `createPayment(data)` - Create payment (credit) for player
- [x] `usePlayerPayments(userId)` - Hook for player's payments
- [x] `usePaymentsService()` - Hook to get service instance

**Business Logic:**
1. Payments are always marked as `paid: true` (they are credits)
2. Payments increase player balance
3. Amount must be positive

**Action Items:**
- [ ] Implement PaymentsService class
- [ ] Create hook usePlayerPayments
- [ ] Add validation (amount > 0)
- [ ] Write unit tests
- [ ] Document API

---

### 5.4 Balance Calculation Service

**File:** `/Users/private/projects/studio/src/services/balance.service.ts`

```typescript
import { Player, Fine, Payment, DuePayment, BeverageConsumption } from '@/lib/types';

/**
 * Service for calculating player balances
 * Based on existing logic in /src/lib/utils.ts
 */
export class BalanceService {
  /**
   * Calculate a player's current balance
   *
   * Formula: Balance = Total Credits - Total Debits
   * Credits = Sum of paid payments
   * Debits = Sum of unpaid (fines + dues + beverages)
   */
  static calculatePlayerBalance(
    playerId: string,
    payments: Payment[],
    fines: Fine[],
    duePayments: DuePayment[],
    beverageConsumptions: BeverageConsumption[]
  ): number {
    // Calculate total credits from payments
    const totalCredits = payments
      .filter(p => p.userId === playerId && p.paid)
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate unpaid fine debits
    const totalFineDebits = fines
      .filter(f => f.userId === playerId)
      .reduce((sum, f) => {
        if (f.paid) return sum;
        const remaining = f.amount - (f.amountPaid || 0);
        return sum + remaining;
      }, 0);

    // Calculate unpaid due debits
    const totalDueDebits = duePayments
      .filter(dp => dp.userId === playerId && !dp.exempt)
      .reduce((sum, dp) => {
        if (dp.paid) return sum;
        const remaining = dp.amountDue - (dp.amountPaid || 0);
        return sum + remaining;
      }, 0);

    // Calculate unpaid beverage debits
    const totalBeverageDebits = beverageConsumptions
      .filter(bc => bc.userId === playerId)
      .reduce((sum, bc) => {
        if (bc.paid) return sum;
        const remaining = bc.amount - (bc.amountPaid || 0);
        return sum + remaining;
      }, 0);

    return totalCredits - totalFineDebits - totalDueDebits - totalBeverageDebits;
  }

  /**
   * Update all players with calculated balances
   */
  static updatePlayersWithBalances(
    players: Player[],
    payments: Payment[],
    fines: Fine[],
    duePayments: DuePayment[],
    beverageConsumptions: BeverageConsumption[]
  ): Player[] {
    return players.map(player => ({
      ...player,
      balance: this.calculatePlayerBalance(
        player.id,
        payments,
        fines,
        duePayments,
        beverageConsumptions
      ),
    }));
  }

  /**
   * Determine payment status based on amounts
   */
  static getPaymentStatus(
    totalAmount: number,
    amountPaid: number | undefined,
    paid: boolean
  ): 'paid' | 'partially_paid' | 'unpaid' {
    if (paid) return 'paid';
    if (!amountPaid || amountPaid === 0) return 'unpaid';
    if (amountPaid > 0 && amountPaid < totalAmount) return 'partially_paid';
    return 'unpaid';
  }
}
```

**Implementation Requirements:**

**Must Implement:**
- [x] `calculatePlayerBalance(playerId, ...)` - Calculate balance for one player
- [x] `updatePlayersWithBalances(players, ...)` - Calculate balances for all players
- [x] `getPaymentStatus(total, paid, status)` - Determine payment status

**Business Logic:**
1. Balance is NEVER stored in Firestore (always calculated)
2. Supports partial payments for fines, dues, and beverages
3. Exempt dues are excluded from balance calculation

**Action Items:**
- [ ] Port existing balance logic from `/src/lib/utils.ts`
- [ ] Add comprehensive unit tests
- [ ] Document calculation formula
- [ ] Add performance optimization (memoization)

---

### 5.5 Additional Services (Brief Specifications)

**Dues Service** (`dues.service.ts`):
- `createDue(data)` - Create new due type
- `useDues()` - Hook for all dues
- `createDuePayment(dueId, userId, data)` - Assign due to player
- `useDuePayments(userId)` - Hook for player's due payments

**Beverages Service** (`beverages.service.ts`):
- `createBeverage(data)` - Create beverage type
- `useBeverages()` - Hook for beverage catalog
- `createConsumption(userId, beverageId, data)` - Record consumption
- `usePlayerConsumptions(userId)` - Hook for player's consumptions

**Predefined Fines Service** (`predefined-fines.service.ts`):
- `createPredefinedFine(data)` - Create fine template
- `usePredefinedFines()` - Hook for fine templates

---

## 6. IMPLEMENTATION PLAN

### Phase 1: Base Infrastructure (Day 1-2)
**Estimated Time:** 6 hours

**Tasks:**
1. Create `/src/services/` directory
2. Implement `base.service.ts`
3. Create `types.ts` with service interfaces
4. Set up testing infrastructure

**Deliverables:**
- ✅ Base service class with query builder
- ✅ Type definitions for services
- ✅ Test setup

### Phase 2: Core Services (Day 3-7)
**Estimated Time:** 20 hours

**Tasks:**
1. Implement PlayersService (Day 3)
2. Implement FinesService with auto-payment (Day 4-5)
3. Implement PaymentsService (Day 5)
4. Implement BalanceService (Day 6)
5. Write comprehensive unit tests (Day 7)

**Deliverables:**
- ✅ All core services implemented
- ✅ Hooks for real-time data access
- ✅ Unit tests with >80% coverage

### Phase 3: Additional Services (Day 8-10)
**Estimated Time:** 12 hours

**Tasks:**
1. Implement DuesService (Day 8)
2. Implement BeveragesService (Day 9)
3. Implement PredefinedFinesService (Day 9)
4. Integration testing (Day 10)

**Deliverables:**
- ✅ All services implemented
- ✅ Integration tests passing

### Phase 4: Documentation & Examples (Day 11)
**Estimated Time:** 4 hours

**Tasks:**
1. Write API documentation for all services
2. Create usage examples
3. Update README

**Deliverables:**
- ✅ Complete API documentation
- ✅ Code examples for common operations

---

## 7. TESTING REQUIREMENTS

### 7.1 Unit Tests

**Test Base Service:**
```typescript
describe('BaseFirebaseService', () => {
  describe('buildQuery', () => {
    test('should build query with filters', () => {
      const service = new TestService(mockFirestore);
      const options: QueryOptions = {
        filters: [{ field: 'paid', operator: '==', value: false }],
      };

      const q = service.buildQuery(options);
      expect(q).toBeDefined();
    });

    test('should build query with ordering', () => {
      const service = new TestService(mockFirestore);
      const options: QueryOptions = {
        orderBy: { field: 'date', direction: 'desc' },
      };

      const q = service.buildQuery(options);
      expect(q).toBeDefined();
    });

    test('should build query with pagination', () => {
      const service = new TestService(mockFirestore);
      const options: QueryOptions = {
        limit: 50,
        startAfter: mockDoc,
      };

      const q = service.buildQuery(options);
      expect(q).toBeDefined();
    });
  });
});
```

**Test Players Service:**
```typescript
describe('PlayersService', () => {
  let service: PlayersService;
  let mockFirestore: Firestore;

  beforeEach(() => {
    mockFirestore = createMockFirestore();
    service = new PlayersService(mockFirestore);
  });

  describe('createPlayer', () => {
    test('should create player with correct initial values', async () => {
      const playerData = {
        name: 'John Doe',
        nickname: 'JD',
        photoUrl: 'https://example.com/photo.jpg',
      };

      await service.createPlayer(playerData);

      // Verify setDoc was called with correct data
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
    test('should update player fields', async () => {
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

**Test Fines Service with Auto-Payment:**
```typescript
describe('FinesService', () => {
  describe('createFine with auto-payment', () => {
    test('should mark fine as paid if player has full credit', async () => {
      const fineData = {
        userId: 'player-1',
        reason: 'Late to practice',
        amount: 5,
        date: '2025-01-15',
      };
      const playerBalance = 10; // Has enough credit

      await service.createFine(fineData, playerBalance);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          paid: true,
          paidAt: expect.any(String),
          amountPaid: 5,
        })
      );
    });

    test('should mark fine as partially paid if player has partial credit', async () => {
      const fineData = {
        userId: 'player-1',
        reason: 'Late to practice',
        amount: 10,
        date: '2025-01-15',
      };
      const playerBalance = 3; // Has partial credit

      await service.createFine(fineData, playerBalance);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          paid: false,
          paidAt: undefined,
          amountPaid: 3, // Used player's credit
        })
      );
    });

    test('should mark fine as unpaid if player has no credit', async () => {
      const fineData = {
        userId: 'player-1',
        reason: 'Late to practice',
        amount: 5,
        date: '2025-01-15',
      };
      const playerBalance = 0; // No credit

      await service.createFine(fineData, playerBalance);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          paid: false,
          paidAt: undefined,
          amountPaid: undefined,
        })
      );
    });
  });
});
```

**Test Balance Calculation:**
```typescript
describe('BalanceService', () => {
  describe('calculatePlayerBalance', () => {
    test('should calculate correct balance with only payments', () => {
      const payments: Payment[] = [
        { id: '1', userId: 'player-1', amount: 50, paid: true, reason: 'Deposit', date: '2025-01-01' },
        { id: '2', userId: 'player-1', amount: 30, paid: true, reason: 'Deposit', date: '2025-01-02' },
      ];

      const balance = BalanceService.calculatePlayerBalance(
        'player-1', payments, [], [], []
      );

      expect(balance).toBe(80); // 50 + 30
    });

    test('should calculate correct balance with payments and unpaid fines', () => {
      const payments: Payment[] = [
        { id: '1', userId: 'player-1', amount: 50, paid: true, reason: 'Deposit', date: '2025-01-01' },
      ];
      const fines: Fine[] = [
        {
          id: '1', userId: 'player-1', amount: 10, paid: false,
          reason: 'Late', date: '2025-01-05', createdAt: '2025-01-05', updatedAt: '2025-01-05'
        },
        {
          id: '2', userId: 'player-1', amount: 5, paid: false,
          reason: 'Absent', date: '2025-01-06', createdAt: '2025-01-06', updatedAt: '2025-01-06'
        },
      ];

      const balance = BalanceService.calculatePlayerBalance(
        'player-1', payments, fines, [], []
      );

      expect(balance).toBe(35); // 50 - 10 - 5
    });

    test('should handle partial payments correctly', () => {
      const payments: Payment[] = [
        { id: '1', userId: 'player-1', amount: 50, paid: true, reason: 'Deposit', date: '2025-01-01' },
      ];
      const fines: Fine[] = [
        {
          id: '1', userId: 'player-1', amount: 10, paid: false, amountPaid: 3,
          reason: 'Late', date: '2025-01-05', createdAt: '2025-01-05', updatedAt: '2025-01-05'
        },
      ];

      const balance = BalanceService.calculatePlayerBalance(
        'player-1', payments, fines, [], []
      );

      expect(balance).toBe(43); // 50 - (10 - 3) = 50 - 7
    });
  });
});
```

### 7.2 Integration Tests

**Test Real-time Hooks:**
```typescript
describe('usePlayers hook', () => {
  test('should return players with real-time updates', async () => {
    const { result } = renderHook(() => usePlayers(), {
      wrapper: FirebaseProviderWrapper,
    });

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify data loaded
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBeGreaterThan(0);
  });

  test('should update when Firestore data changes', async () => {
    const { result } = renderHook(() => usePlayers(), {
      wrapper: FirebaseProviderWrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const initialCount = result.current.data?.length || 0;

    // Add a new player via Firestore
    await addDoc(collection(firestore, 'users'), {
      name: 'Test Player',
      nickname: 'TP',
      photoUrl: 'https://example.com/test.jpg',
    });

    // Wait for update
    await waitFor(() => {
      expect(result.current.data?.length).toBe(initialCount + 1);
    });
  });
});
```

---

## 8. SUCCESS METRICS

### 8.1 Technical Metrics
- **Service Coverage**: 100% of entities have service classes
- **Type Safety**: Zero TypeScript errors in service layer
- **Test Coverage**: >80% for all services
- **Hook Performance**: Real-time updates within 300ms

### 8.2 Code Quality Metrics
- **Documentation**: 100% of public methods documented with JSDoc
- **Consistency**: All services follow same pattern
- **Error Handling**: All operations have proper error handling
- **Type Exports**: All service types exported for external use

---

## 9. ROLLOUT PLAN

### 9.1 Development Phase
1. Implement services incrementally (Players → Fines → Payments → etc.)
2. Test each service in isolation with unit tests
3. Test services together with integration tests
4. Code review and refactoring

### 9.2 Integration Phase
1. Replace static data imports in ONE page (Players page)
2. Verify real-time updates work
3. Test error scenarios
4. Verify balance calculations correct
5. Repeat for other pages

---

## 10. DOCUMENTATION DELIVERABLES

### 10.1 API Documentation
```typescript
/**
 * Players Service
 *
 * Manages player (user) data in Firestore.
 *
 * @example
 * ```typescript
 * // Get all players
 * const { data: players, isLoading } = usePlayers();
 *
 * // Get specific player
 * const { data: player } = usePlayer('player-123');
 *
 * // Create new player
 * const service = usePlayersService();
 * await service.createPlayer({
 *   name: 'John Doe',
 *   nickname: 'JD',
 *   photoUrl: 'https://example.com/photo.jpg',
 * });
 * ```
 */
```

### 10.2 Usage Examples
- Creating entities
- Querying with filters
- Real-time updates
- Error handling
- Balance calculations

---

**Document Status:** Ready for Implementation
**Approval Required:** Technical Lead, Product Owner
**Next PRD:** PRD-03-UI-Component-Migration.md