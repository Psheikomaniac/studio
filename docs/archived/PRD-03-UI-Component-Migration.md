# PRD-03: UI Component Migration to Firebase

**Product Requirements Document**
**Version:** 1.0
**Date:** 2025-10-27
**Owner:** Frontend Team Lead
**Status:** Ready for Implementation
**Priority:** P0 (Critical)
**Dependencies:** PRD-01 (Infrastructure), PRD-02 (Service Layer)

---

## 1. OVERVIEW

### 1.1 Purpose
Migrate all UI components from using static data to Firebase Firestore with real-time synchronization, while maintaining existing functionality and user experience.

### 1.2 Background
The application currently uses static data imported from `/src/lib/static-data.ts` with local component state (`useState`). Components need to be refactored to use Firebase hooks and services for real-time data access.

### 1.3 Scope
**In Scope:**
- Dashboard page (`/dashboard`)
- Players page (`/players`)
- Money/Transactions page (`/money`)
- Settings page (`/settings`)
- All dialog components (Add/Edit/Delete)
- Balance calculation integration

**Out of Scope:**
- Login page (already uses Firebase Auth)
- UI/design changes
- New features

### 1.4 Success Criteria
- ✅ All pages display data from Firestore instead of static data
- ✅ Real-time updates work across all components
- ✅ Loading states implemented for all async operations
- ✅ Error handling implemented for all Firestore operations
- ✅ Balance calculations remain accurate
- ✅ No regression in existing functionality

---

## 2. MIGRATION STRATEGY

### 2.1 Incremental Migration Approach

**Phase 1: Players Page** (Lowest Risk)
- Simple CRUD operations
- Single entity type
- No complex relationships
- Tests migration pattern

**Phase 2: Dashboard** (Medium Risk)
- Multiple entity types
- Balance calculations
- Complex aggregations
- Tests real-time updates

**Phase 3: Money Page** (Medium Risk)
- Transaction filtering
- Status toggling
- Pagination
- Tests complex queries

**Phase 4: Settings** (Low Risk)
- CSV import functionality
- Catalog management
- Tests batch operations

### 2.2 Feature Flag Strategy

**Environment Variable:** `NEXT_PUBLIC_USE_FIREBASE`

```typescript
// Use Firebase or fallback to static data
const useFirebaseData = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
```

**Hybrid Data Source Pattern:**
```typescript
// src/lib/data-source.ts
import { Player } from './types';
import { players as staticPlayers } from './static-data';
import { usePlayers as useFirebasePlayers } from '@/services/players.service';

export function usePlayers() {
  const useFirebase = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

  const firebaseResult = useFirebasePlayers();

  if (!useFirebase) {
    return {
      data: staticPlayers,
      isLoading: false,
      error: null,
    };
  }

  return firebaseResult;
}
```

---

## 3. COMPONENT MIGRATION REQUIREMENTS

### 3.1 Players Page Migration

**File:** `/Users/private/projects/studio/src/app/(app)/players/page.tsx`

**Current Implementation:**
```typescript
'use client';

import { useState } from 'react';
import { players as staticPlayers } from '@/lib/static-data';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>(staticPlayers);
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | undefined>();

  const handleSavePlayer = (playerData: Player) => {
    if (selectedPlayer) {
      // Update existing
      setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? playerData : p));
    } else {
      // Add new
      setPlayers(prev => [...prev, playerData]);
    }
    setAddEditDialogOpen(false);
  };

  const handleDeletePlayer = (playerId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  return (
    <div>
      {/* Player list UI */}
    </div>
  );
}
```

**Required Changes:**

```typescript
'use client';

import { useState } from 'react';
import { usePlayers, usePlayersService } from '@/services/players.service';
import { Player } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PlayersPage() {
  // Replace static data with Firebase hook
  const { data: players, isLoading, error } = usePlayers();
  const playersService = usePlayersService();
  const { toast } = useToast();

  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | undefined>();

  const handleSavePlayer = async (playerData: Omit<Player, 'id'>) => {
    try {
      if (selectedPlayer) {
        // Update existing
        await playersService.updatePlayer(selectedPlayer.id, playerData);
        toast({
          title: 'Player Updated',
          description: `${playerData.name} has been updated successfully.`,
        });
      } else {
        // Add new
        await playersService.createPlayer(playerData);
        toast({
          title: 'Player Added',
          description: `${playerData.name} has been added successfully.`,
        });
      }
      setAddEditDialogOpen(false);
      setSelectedPlayer(undefined);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save player',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    try {
      await playersService.deletePlayer(playerId);
      toast({
        title: 'Player Deleted',
        description: 'Player has been deleted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete player',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load players: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state
  if (!players || players.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-muted-foreground">No players found. Add your first player to get started.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Player list UI - same as before */}
    </div>
  );
}
```

**Action Items:**
- [ ] Replace static import with `usePlayers()` hook
- [ ] Replace `useState` with service calls
- [ ] Add loading skeleton component
- [ ] Add error state display
- [ ] Add empty state message
- [ ] Update all handlers to be async
- [ ] Add toast notifications for success/error
- [ ] Test real-time updates (add player in Firebase Console)
- [ ] Test error scenarios (network offline)

---

### 3.2 Dashboard Page Migration

**File:** `/Users/private/projects/studio/src/app/(app)/dashboard/page.tsx`

**Current Complexity:**
- Multiple entity types (players, fines, payments, dues, beverages)
- Dynamic balance calculations
- Recent transactions aggregation
- Statistics calculations

**Required Changes:**

```typescript
'use client';

import { useMemo } from 'react';
import { usePlayers } from '@/services/players.service';
import { usePlayerFines } from '@/services/fines.service';
import { usePlayerPayments } from '@/services/payments.service';
import { useDuePayments } from '@/services/dues.service';
import { usePlayerConsumptions } from '@/services/beverages.service';
import { BalanceService } from '@/services/balance.service';

export default function DashboardPage() {
  // Load all data with Firebase hooks
  const { data: players, isLoading: playersLoading } = usePlayers();

  // Note: For dashboard, we need ALL fines/payments across all players
  // This may require collection group queries or aggregation
  const { data: allFines, isLoading: finesLoading } = useAllFines();
  const { data: allPayments, isLoading: paymentsLoading } = useAllPayments();
  const { data: allDuePayments, isLoading: duePaymentsLoading } = useAllDuePayments();
  const { data: allConsumptions, isLoading: consumptionsLoading } = useAllConsumptions();

  // Calculate balances when all data is loaded
  const playersWithBalances = useMemo(() => {
    if (!players || !allFines || !allPayments || !allDuePayments || !allConsumptions) {
      return [];
    }

    return BalanceService.updatePlayersWithBalances(
      players,
      allPayments,
      allFines,
      allDuePayments,
      allConsumptions
    );
  }, [players, allFines, allPayments, allDuePayments, allConsumptions]);

  // Calculate recent transactions
  const recentTransactions = useMemo(() => {
    if (!allFines || !allPayments || !allDuePayments || !allConsumptions) {
      return [];
    }

    // Aggregate all transactions
    const transactions = [
      ...allFines.map(f => ({ ...f, type: 'fine' as const })),
      ...allPayments.map(p => ({ ...p, type: 'payment' as const })),
      ...allDuePayments.map(dp => ({ ...dp, type: 'due' as const })),
      ...allConsumptions.map(bc => ({ ...bc, type: 'beverage' as const })),
    ];

    // Sort by date and take top 10
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [allFines, allPayments, allDuePayments, allConsumptions]);

  // Show loading state while ANY data is loading
  const isLoading = playersLoading || finesLoading || paymentsLoading ||
                    duePaymentsLoading || consumptionsLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Players"
          value={playersWithBalances.length}
        />
        <StatsCard
          title="Total Balance"
          value={`€${playersWithBalances.reduce((sum, p) => sum + p.balance, 0).toFixed(2)}`}
        />
        {/* More stats... */}
      </div>

      {/* Player grid with balances */}
      <PlayerGrid players={playersWithBalances} />

      {/* Recent transactions */}
      <RecentTransactions transactions={recentTransactions} />
    </div>
  );
}
```

**Challenges:**
1. **Multiple Real-time Listeners**: Dashboard needs data from 5+ collections
2. **Performance**: May have 100+ documents across all collections
3. **Balance Calculation**: Must wait for ALL data before calculating

**Solutions:**
1. **Pagination**: Limit recent transactions to 50 items
2. **Indexing**: Create composite indexes for common queries
3. **Caching**: Use React Query or SWR for query caching
4. **Loading States**: Show progressive loading (stats → players → transactions)

**Action Items:**
- [ ] Create collection group query hooks for dashboard
- [ ] Implement progressive loading states
- [ ] Add balance calculation with all dependencies
- [ ] Add error handling for each data source
- [ ] Test with large datasets (100+ transactions)
- [ ] Monitor Firestore read costs
- [ ] Optimize queries with proper indexes

---

### 3.3 Dialog Components Migration

**Pattern for All Dialog Components:**

**Current Pattern:**
```typescript
interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (player: Player) => void; // Callback pattern
}

export function AddPlayerDialog({ open, onOpenChange, onSave }: AddPlayerDialogProps) {
  const handleSubmit = (data: Player) => {
    onSave(data); // Parent handles state update
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Form */}
    </Dialog>
  );
}
```

**Firebase Pattern (Option 1: Keep Callback):**
```typescript
interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // Optional success callback
}

export function AddPlayerDialog({ open, onOpenChange, onSuccess }: AddPlayerDialogProps) {
  const playersService = usePlayersService();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Omit<Player, 'id'>) => {
    setIsSubmitting(true);

    try {
      await playersService.createPlayer(data);

      toast({
        title: 'Success',
        description: `${data.name} has been added.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add player',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Form with isSubmitting state */}
      </DialogContent>
    </Dialog>
  );
}
```

**Firebase Pattern (Option 2: No Callback - Relies on Real-time):**
```typescript
// Parent component doesn't need to do anything
// Real-time listener automatically updates the list

export function AddPlayerDialog({ open, onOpenChange }: AddPlayerDialogProps) {
  const playersService = usePlayersService();
  const { toast } = useToast();

  const handleSubmit = async (data: Omit<Player, 'id'>) => {
    try {
      await playersService.createPlayer(data);

      toast({ title: 'Success', description: `${data.name} has been added.` });
      onOpenChange(false);

      // No callback needed - parent will update automatically via real-time listener
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add player',
        variant: 'destructive',
      });
    }
  };

  return <Dialog>{/* Form */}</Dialog>;
}
```

**Recommendation:** Use Option 2 (no callback) - leverages Firebase real-time updates.

**Dialog Components to Migrate:**
- [ ] `AddEditPlayerDialog` - `/src/components/players/add-edit-player-dialog.tsx`
- [ ] `AddFineDialog` - `/src/components/dashboard/add-fine-dialog.tsx`
- [ ] `AddPaymentDialog` - `/src/components/payments/add-edit-payment-dialog.tsx`
- [ ] `AddDueDialog` - `/src/components/dues/add-edit-due-dialog.tsx`
- [ ] `AssignDueDialog` - `/src/components/dues/assign-due-dialog.tsx`
- [ ] `AddBeverageDialog` - `/src/components/beverages/add-edit-beverage-dialog.tsx`
- [ ] `RecordConsumptionDialog` - `/src/components/beverages/record-consumption-dialog.tsx`

**Action Items for Each Dialog:**
- [ ] Remove callback prop pattern
- [ ] Add service instance via hook
- [ ] Implement async submit handler
- [ ] Add loading state during submission
- [ ] Add error handling with toast
- [ ] Test optimistic updates

---

### 3.4 Money/Transactions Page Migration

**File:** `/Users/private/projects/studio/src/app/(app)/money/page.tsx`

**Current Features:**
- Unified transaction view (fines + payments + dues + beverages)
- Filtering by type, player, status
- Search by description
- Status toggling (mark as paid/unpaid)

**Required Changes:**

```typescript
'use client';

import { useMemo, useState } from 'react';
import { useAllTransactions } from '@/services/transactions.service'; // New hook

export default function MoneyPage() {
  const { data: transactions, isLoading, error } = useAllTransactions();

  const [filterType, setFilterType] = useState<'all' | 'fine' | 'payment' | 'due' | 'beverage'>('all');
  const [filterPlayer, setFilterPlayer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side filtering (for now)
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterPlayer !== 'all' && t.userId !== filterPlayer) return false;
      if (filterStatus !== 'all') {
        const isPaid = t.paid;
        if (filterStatus === 'paid' && !isPaid) return false;
        if (filterStatus === 'unpaid' && isPaid) return false;
      }
      if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [transactions, filterType, filterPlayer, filterStatus, searchQuery]);

  if (isLoading) return <TransactionsSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="fine">Fines</SelectItem>
          <SelectItem value="payment">Payments</SelectItem>
          <SelectItem value="due">Dues</SelectItem>
          <SelectItem value="beverage">Beverages</SelectItem>
        </Select>
        {/* More filters... */}
      </div>

      {/* Transaction list */}
      <TransactionList transactions={filteredTransactions} />
    </div>
  );
}
```

**Challenge: Unified Transaction Query**

Need to aggregate data from multiple collections:

**Solution 1: Client-side Aggregation (Current Approach)**
```typescript
export function useAllTransactions() {
  const { data: fines } = useAllFines();
  const { data: payments } = useAllPayments();
  const { data: duePayments } = useAllDuePayments();
  const { data: consumptions } = useAllConsumptions();

  const transactions = useMemo(() => {
    if (!fines || !payments || !duePayments || !consumptions) return null;

    return [
      ...fines.map(f => ({ ...f, type: 'fine', description: f.reason })),
      ...payments.map(p => ({ ...p, type: 'payment', description: p.reason })),
      ...duePayments.map(dp => ({ ...dp, type: 'due', description: dp.userName })),
      ...consumptions.map(bc => ({ ...bc, type: 'beverage', description: bc.beverageName })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fines, payments, duePayments, consumptions]);

  return { data: transactions, isLoading: !transactions };
}
```

**Solution 2: Server-side Aggregation (Future Optimization)**
- Create Cloud Function to aggregate transactions
- Store in `/transactions/{transactionId}` collection
- Use Firestore triggers to keep in sync

**Recommendation:** Start with Solution 1 (client-side), optimize later if needed.

**Action Items:**
- [ ] Create `useAllTransactions` hook
- [ ] Implement client-side filtering
- [ ] Add pagination (50 transactions per page)
- [ ] Implement status toggling
- [ ] Test performance with 500+ transactions
- [ ] Consider server-side aggregation if slow

---

### 3.5 Settings Page Migration

**File:** `/Users/private/projects/studio/src/app/(app)/settings/page.tsx`

**Current Features:**
- CSV import for dues, fines, beverages
- Manage predefined fines
- Manage beverage catalog

**Required Changes:**

**CSV Import:** Update to write to Firestore instead of static arrays

```typescript
// src/lib/csv-import.ts

// BEFORE
export async function importDuesCSV(csvText: string) {
  // ... parse CSV ...

  // Add to static data arrays
  staticDues.push(newDue);
  staticDuePayments.push(...newDuePayments);
}

// AFTER
import { writeBatch, collection, doc } from 'firebase/firestore';

export async function importDuesCSV(csvText: string, firestore: Firestore) {
  // ... parse CSV ...

  // Use Firestore batch write
  const batch = writeBatch(firestore);

  // Add due
  const dueRef = doc(collection(firestore, 'dues'));
  batch.set(dueRef, newDue);

  // Add due payments
  newDuePayments.forEach(dp => {
    const dpRef = doc(collection(firestore, 'duePayments'));
    batch.set(dpRef, dp);
  });

  await batch.commit();

  return { success: true, recordsCreated: newDuePayments.length };
}
```

**Action Items:**
- [ ] Update CSV import functions to use Firestore batch writes
- [ ] Add progress indicators for batch operations
- [ ] Update predefined fines management to use Firestore
- [ ] Update beverage catalog to use Firestore
- [ ] Test with large CSV files (500+ rows)
- [ ] Add rollback mechanism for failed imports

---

## 4. LOADING & ERROR STATES

### 4.1 Loading State Components

**Create Skeleton Components:**

**File:** `/Users/private/projects/studio/src/components/ui/skeleton.tsx` (exists)

**Create Page-Specific Skeletons:**

```typescript
// src/components/skeletons/players-skeleton.tsx
export function PlayersSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// src/components/skeletons/dashboard-skeleton.tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Player grid */}
      <Skeleton className="h-64" />

      {/* Recent transactions */}
      <Skeleton className="h-96" />
    </div>
  );
}
```

### 4.2 Error State Components

**Create Reusable Error Display:**

```typescript
// src/components/error-display.tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: Error;
  retry?: () => void;
}

export function ErrorDisplay({ error, retry }: ErrorDisplayProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Loading Data</AlertTitle>
      <AlertDescription className="mt-2">
        {error.message}

        {retry && (
          <Button
            onClick={retry}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

### 4.3 Empty State Components

```typescript
// src/components/empty-state.tsx
interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2">{description}</p>

      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

**Action Items:**
- [ ] Create skeleton components for all pages
- [ ] Create error display component
- [ ] Create empty state component
- [ ] Add loading states to all pages
- [ ] Add error states to all pages
- [ ] Add empty states where applicable

---

## 5. TESTING REQUIREMENTS

### 5.1 Component Testing

**Test Players Page:**
```typescript
describe('PlayersPage', () => {
  test('should display loading state initially', () => {
    render(<PlayersPage />);
    expect(screen.getByTestId('players-skeleton')).toBeInTheDocument();
  });

  test('should display players after loading', async () => {
    render(<PlayersPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('players-skeleton')).not.toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('should display error state on error', async () => {
    // Mock error
    vi.mocked(usePlayers).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    render(<PlayersPage />);

    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
  });

  test('should add player successfully', async () => {
    render(<PlayersPage />);

    // Click add button
    await userEvent.click(screen.getByText('Add Player'));

    // Fill form
    await userEvent.type(screen.getByLabelText('Name'), 'Jane Doe');
    await userEvent.type(screen.getByLabelText('Nickname'), 'JD');

    // Submit
    await userEvent.click(screen.getByText('Save'));

    // Verify success toast
    expect(screen.getByText(/Player Added/i)).toBeInTheDocument();
  });
});
```

### 5.2 Integration Testing

**Test Real-time Updates:**
```typescript
describe('Real-time Updates', () => {
  test('should update UI when Firestore data changes', async () => {
    const { rerender } = render(<PlayersPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Simulate Firestore update (add new player)
    await addDoc(collection(firestore, 'users'), {
      name: 'New Player',
      nickname: 'NP',
      photoUrl: 'https://example.com/photo.jpg',
    });

    // Wait for real-time update
    await waitFor(() => {
      expect(screen.getByText('New Player')).toBeInTheDocument();
    });
  });
});
```

### 5.3 E2E Testing

**Test Complete Workflows:**
```typescript
test('should add fine and update balance in real-time', async () => {
  await page.goto('/dashboard');

  // Wait for dashboard to load
  await page.waitForSelector('[data-testid="player-grid"]');

  // Note initial balance
  const initialBalance = await page.textContent('[data-testid="player-1-balance"]');

  // Open add fine dialog
  await page.click('[data-testid="add-fine-button"]');

  // Fill form
  await page.selectOption('[data-testid="player-select"]', 'player-1');
  await page.fill('[data-testid="fine-amount"]', '5');
  await page.fill('[data-testid="fine-reason"]', 'Late to practice');

  // Submit
  await page.click('[data-testid="submit-fine"]');

  // Wait for success toast
  await page.waitForSelector('text=Fine Added');

  // Verify balance updated
  await page.waitForFunction(
    (selector, expected) => {
      const element = document.querySelector(selector);
      return element && element.textContent !== expected;
    },
    '[data-testid="player-1-balance"]',
    initialBalance
  );
});
```

---

## 6. IMPLEMENTATION PLAN

### Phase 1: Players Page (Days 1-3)
**Estimated Time:** 12 hours

**Tasks:**
1. Migrate Players page to Firebase hooks (Day 1)
2. Update AddEditPlayerDialog component (Day 1)
3. Add loading and error states (Day 2)
4. Write component tests (Day 2)
5. Integration testing with Firestore emulator (Day 3)
6. Code review and fixes (Day 3)

**Deliverables:**
- ✅ Players page fully migrated
- ✅ All tests passing
- ✅ Loading/error states implemented

### Phase 2: Dashboard (Days 4-7)
**Estimated Time:** 16 hours

**Tasks:**
1. Create hooks for all dashboard data (Day 4)
2. Integrate balance calculation (Day 4)
3. Update dashboard UI with Firebase hooks (Day 5)
4. Migrate AddFineDialog with auto-payment (Day 5)
5. Add loading states and skeletons (Day 6)
6. Performance testing and optimization (Day 7)
7. Write tests (Day 7)

**Deliverables:**
- ✅ Dashboard fully migrated
- ✅ Balance calculations working correctly
- ✅ Performance acceptable (<2s load time)

### Phase 3: Money Page (Days 8-10)
**Estimated Time:** 12 hours

**Tasks:**
1. Create useAllTransactions hook (Day 8)
2. Migrate Money page UI (Day 8)
3. Implement status toggling (Day 9)
4. Add pagination (Day 9)
5. Write tests (Day 10)

**Deliverables:**
- ✅ Money page fully migrated
- ✅ All transaction types displayed
- ✅ Filtering and search working

### Phase 4: Settings & Dialogs (Days 11-14)
**Estimated Time:** 16 hours

**Tasks:**
1. Update CSV import to Firestore (Day 11-12)
2. Migrate remaining dialogs (Day 12-13)
3. Update catalog management (Day 13)
4. Comprehensive testing (Day 14)

**Deliverables:**
- ✅ All pages migrated
- ✅ CSV import working with Firestore
- ✅ All dialogs updated

---

## 7. SUCCESS METRICS

### 7.1 Functional Metrics
- **Data Accuracy**: 100% of operations reflect correctly in UI
- **Real-time Updates**: Updates appear within 500ms
- **Error Rate**: <0.1% of operations fail
- **Feature Parity**: 100% of existing features work

### 7.2 Performance Metrics
- **Initial Load**: <2s for dashboard on 4G
- **Subsequent Loads**: <300ms with cache
- **UI Responsiveness**: No janky animations or lag

### 7.3 User Experience Metrics
- **Loading States**: All async operations show loading indicators
- **Error Messages**: Clear, actionable error messages
- **Empty States**: Helpful empty state messages
- **Toast Notifications**: Appropriate feedback for all actions

---

## 8. ROLLBACK PLAN

### 8.1 Feature Flag Rollback
```bash
# Disable Firebase, revert to static data
NEXT_PUBLIC_USE_FIREBASE=false

# Redeploy
npm run build && npm run start
```

### 8.2 Page-by-Page Rollback
- Keep static data file during migration
- Each page can independently fall back to static data
- Gradual rollback if issues arise

---

## 9. DOCUMENTATION DELIVERABLES

### 9.1 Developer Guide
- [ ] Migration pattern documentation
- [ ] Hook usage examples
- [ ] Error handling patterns
- [ ] Loading state patterns

### 9.2 Component Documentation
- [ ] Updated component API docs
- [ ] Props documentation
- [ ] Usage examples

---

**Document Status:** Ready for Implementation
**Approval Required:** Frontend Lead, Product Owner
**Next PRD:** PRD-04-Testing-Quality-Assurance.md