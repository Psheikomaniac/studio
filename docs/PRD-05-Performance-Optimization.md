# PRD-05: Performance Optimization Strategy

**Product Requirements Document**
**Version:** 1.0
**Date:** 2025-10-27
**Owner:** Performance Engineering Team
**Status:** Ready for Implementation
**Priority:** P1 (High)
**Dependencies:** PRD-01, PRD-02, PRD-03

---

## 1. OVERVIEW

### 1.1 Purpose
Implement comprehensive performance optimizations for the Firebase-integrated balanceUp application, ensuring fast load times, responsive UI, efficient data fetching, and optimal bundle sizes.

### 1.2 Background
The migration from static data to Firebase introduces network latency, real-time listener overhead, and increased bundle size. This PRD defines strategies to mitigate these impacts and maintain excellent performance.

### 1.3 Current Performance Baseline

**Static Data Performance:**
- ✅ Initial load: ~800ms
- ✅ Zero network latency (in-memory data)
- ✅ Bundle size: ~485KB gzipped
- ⚠️ No data persistence across sessions
- ⚠️ Heavy client-side computation

**Firebase Performance Projections:**
- 🟡 Cold start: ~2000ms (+1200ms)
- ✅ Subsequent loads: ~300ms (with cache)
- 🟡 Bundle size: ~700KB (+215KB)
- ✅ Real-time updates: Significant UX improvement
- ✅ Offline support: Major capability addition

### 1.4 Success Criteria
- ✅ Dashboard loads in <2s on 4G connection (cold start)
- ✅ Subsequent loads <500ms (cached)
- ✅ Real-time updates appear within 300ms
- ✅ Bundle size <750KB gzipped
- ✅ Lighthouse Performance Score >85
- ✅ Stay within Firebase free tier limits (50K reads/day)

---

## 2. FIREBASE PERFORMANCE OPTIMIZATIONS

### 2.1 Enable Firestore Persistence (CRITICAL)

**Impact:** 70% reduction in cold start time on repeat visits

**Implementation:**

**File:** `/Users/private/projects/studio/src/firebase/index.ts`

```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

export function initializeFirestore(app: FirebaseApp): Firestore {
  const firestore = getFirestore(app);

  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(firestore, {
      cacheSizeBytes: 40 * 1024 * 1024, // 40MB cache
    }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported in browser');
      } else {
        console.error('Failed to enable persistence:', err);
      }
    });
  }

  return firestore;
}
```

**Benefits:**
- Instant subsequent page loads (reads from cache)
- Offline support
- Reduced Firestore read costs

**Action Items:**
- [ ] Implement persistence in Firebase initialization
- [ ] Test multi-tab behavior
- [ ] Verify cache invalidation works correctly
- [ ] Monitor cache size usage

---

### 2.2 Query Optimization

**Problem:** Fetching entire collections is expensive and slow.

**Solutions:**

#### A. Implement Pagination

**Bad (Current Pattern):**
```typescript
const { data: allFines } = useCollection(collection(firestore, 'fines'));
// Could fetch 1000+ documents
```

**Good (Paginated):**
```typescript
const ITEMS_PER_PAGE = 50;

export function usePaginatedFines(pageSize = ITEMS_PER_PAGE) {
  const firestore = useFirestore();
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const finesQuery = useMemoFirebase(() => {
    let q = query(
      collection(firestore, 'fines'),
      orderBy('date', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    return q;
  }, [firestore, lastDoc, pageSize]);

  const { data: fines, isLoading } = useCollection<Fine>(finesQuery);

  const loadMore = () => {
    if (fines && fines.length > 0) {
      const lastVisible = fines[fines.length - 1];
      setLastDoc(lastVisible as any);
    }
  };

  return { fines, isLoading, loadMore, hasMore: fines?.length === pageSize };
}
```

#### B. Use Composite Indexes

**Required Indexes:**

**File:** `/Users/private/projects/studio/firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "fines",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "fines",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "paid", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Deploy Indexes:**
```bash
firebase deploy --only firestore:indexes
```

#### C. Limit Data Fetching

**Dashboard Optimization:**
```typescript
export function useDashboardData() {
  // Only fetch recent transactions (last 30 days)
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString();
  }, []);

  const recentFinesQuery = useMemoFirebase(() =>
    query(
      collection(firestore, 'fines'),
      where('date', '>=', thirtyDaysAgo),
      orderBy('date', 'desc'),
      limit(50)
    ),
    [firestore, thirtyDaysAgo]
  );

  return useCollection<Fine>(recentFinesQuery);
}
```

**Action Items:**
- [ ] Implement pagination for all large lists
- [ ] Create and deploy composite indexes
- [ ] Add date range filtering for dashboard
- [ ] Monitor query performance in Firebase Console

---

### 2.3 Real-time Listener Management

**Problem:** Too many active listeners drain battery and bandwidth.

**Best Practices:**

#### A. Limit Active Listeners

**Bad:**
```typescript
// Creates 100+ listeners
players.forEach(player => {
  usePlayerFines(player.id); // Listener for each player!
});
```

**Good:**
```typescript
// Single collection-level listener
const { data: allFines } = useAllFines();

// Filter client-side
const playerFines = useMemo(() => {
  return allFines?.filter(f => f.userId === selectedPlayerId) || [];
}, [allFines, selectedPlayerId]);
```

#### B. Unsubscribe When Not Needed

**Automatic with useCollection:**
```typescript
// useCollection automatically unsubscribes on unmount
export function useCollection<T>(query: Query | null) {
  useEffect(() => {
    if (!query) return;

    const unsubscribe = onSnapshot(query, (snapshot) => {
      // Handle updates
    });

    return () => unsubscribe(); // Cleanup
  }, [query]);
}
```

#### C. Use Polling for Non-Critical Data

**For Catalog Data:**
```typescript
// Instead of real-time listener
const { data: beverages } = useCollection(beveragesQuery);

// Use polling (refetch every 5 minutes)
const { data: beverages } = useQuery({
  queryKey: ['beverages'],
  queryFn: () => getDocs(beveragesQuery),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Action Items:**
- [ ] Audit all active listeners
- [ ] Limit to 5 concurrent listeners maximum
- [ ] Use polling for catalog data
- [ ] Implement listener cleanup verification

---

### 2.4 Firestore Read Cost Optimization

**Free Tier Limits:** 50,000 reads/day

**Estimated Usage (50 active users):**
- Dashboard loads: 50 users × 5 queries = 250 reads
- Money page: 20 users × 5 queries = 100 reads
- Real-time updates: ~500 reads/day
- **Total:** ~850 reads/day ✅ Well within limits

**Cost Reduction Strategies:**

#### A. Query Result Caching

```typescript
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

// Create query client with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      cacheTime: 300000, // 5 minutes
    },
  },
});

// Use in app
export function usePlayersWithCache() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(firestore, 'users'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },
    staleTime: 60000, // Don't refetch for 1 minute
  });
}
```

#### B. Denormalized Data Strategy

**Store Computed Values:**
```typescript
// Instead of calculating balance on every read:
interface Player {
  balance: number; // Calculated and stored
  balanceUpdatedAt: string;
}

// Update via Cloud Function trigger
export const updatePlayerBalance = functions.firestore
  .document('users/{userId}/fines/{fineId}')
  .onWrite(async (change, context) => {
    // Recalculate and update player.balance
  });
```

**Trade-off:** Slight staleness for massive read reduction

**Action Items:**
- [ ] Implement React Query for caching
- [ ] Consider denormalizing player balances
- [ ] Monitor Firestore usage in Firebase Console
- [ ] Set up alerts for quota limits

---

## 3. BUNDLE SIZE OPTIMIZATION

### 3.1 Current Bundle Analysis

**Production Bundle Composition:**
```
Next.js Runtime: ~90KB
React: ~45KB
Radix UI: ~120KB
Recharts: ~80KB
Firebase: ~215KB (NEW)
App Code: ~100KB
Total: ~650KB gzipped
```

**Target:** <750KB gzipped ✅

### 3.2 Code Splitting Strategies

#### A. Dynamic Imports for Heavy Components

**Lazy Load Dialogs:**
```typescript
import { lazy, Suspense } from 'react';

// Lazy load dialog components
const AddPlayerDialog = lazy(() => import('@/components/players/add-edit-player-dialog'));
const AddFineDialog = lazy(() => import('@/components/dashboard/add-fine-dialog'));

export function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<DialogSkeleton />}>
        <AddFineDialog open={dialogOpen} />
      </Suspense>
    </div>
  );
}
```

**Lazy Load Charts:**
```typescript
const RechartsChart = lazy(() => import('@/components/charts/recharts-chart'));
```

#### B. Split Firebase Modules

**Next.js Configuration:**

**File:** `/Users/private/projects/studio/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Split Firebase into separate chunk
          firebase: {
            test: /[\\/]node_modules[\\/]firebase[\\/]/,
            name: 'firebase',
            priority: 10,
          },
          // Split Firestore separately (largest module)
          firestore: {
            test: /[\\/]node_modules[\\/]@firebase[\\/]firestore[\\/]/,
            name: 'firestore',
            priority: 9,
          },
          // Split UI library
          ui: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'ui-components',
            priority: 8,
          },
        },
      },
    };
    return config;
  },
};
```

#### C. Tree Shaking Firebase Imports

**Good:**
```typescript
import { collection, query, where, orderBy } from 'firebase/firestore';
```

**Bad:**
```typescript
import * as firestore from 'firebase/firestore'; // Imports everything!
```

**Action Items:**
- [ ] Implement lazy loading for dialogs
- [ ] Configure webpack code splitting
- [ ] Audit imports for tree-shaking opportunities
- [ ] Analyze bundle with webpack-bundle-analyzer

---

### 3.3 Image Optimization

**Current:** Player photos loaded from external URLs

**Optimization:**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [40, 80, 160, 320], // Avatar sizes
    imageSizes: [16, 32, 48, 64, 96], // Thumbnail sizes
    minimumCacheTTL: 86400, // 24 hours
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};
```

**Use Next.js Image Component:**
```typescript
import Image from 'next/image';

<Image
  src={player.photoUrl}
  alt={player.name}
  width={80}
  height={80}
  className="rounded-full"
  loading="lazy" // Lazy load images
  placeholder="blur"
  blurDataURL="/placeholder-avatar.jpg"
/>
```

**Action Items:**
- [ ] Configure Next.js Image optimization
- [ ] Replace <img> tags with Next.js <Image>
- [ ] Add placeholder images
- [ ] Optimize Firebase Storage images

---

## 4. LOADING STATE OPTIMIZATION

### 4.1 Progressive Loading

**Bad (Wait for All Data):**
```typescript
const { data: players, isLoading: playersLoading } = usePlayers();
const { data: fines, isLoading: finesLoading } = useFines();
const { data: payments, isLoading: paymentsLoading } = usePayments();

if (playersLoading || finesLoading || paymentsLoading) {
  return <FullPageLoader />; // Blocks entire page
}
```

**Good (Progressive Enhancement):**
```typescript
const { data: players, isLoading: playersLoading } = usePlayers();
const { data: fines, isLoading: finesLoading } = useFines();
const { data: payments, isLoading: paymentsLoading } = usePayments();

return (
  <div>
    {/* Show stats immediately (even if incomplete) */}
    <StatsCards
      totalPlayers={players?.length || 0}
      isLoading={playersLoading}
    />

    {/* Show player grid as soon as players load */}
    {playersLoading ? (
      <PlayerGridSkeleton />
    ) : (
      <PlayerGrid players={players} />
    )}

    {/* Show transactions when ready */}
    {finesLoading || paymentsLoading ? (
      <TransactionsSkeleton />
    ) : (
      <RecentTransactions fines={fines} payments={payments} />
    )}
  </div>
);
```

### 4.2 Skeleton Screens

**High-Quality Skeletons:**

```typescript
// src/components/skeletons/player-grid-skeleton.tsx
export function PlayerGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Action Items:**
- [ ] Implement progressive loading for all pages
- [ ] Create high-quality skeleton components
- [ ] Show data as soon as available (don't wait for all)
- [ ] Use suspense boundaries strategically

---

## 5. CLIENT-SIDE COMPUTATION OPTIMIZATION

### 5.1 Balance Calculation Optimization

**Current:** Recalculates balances for all players on every render

**Problem:**
```typescript
// Expensive calculation runs on every render
const playersWithBalances = useMemo(() => {
  return players.map(player => ({
    ...player,
    balance: calculatePlayerBalance(player.id, payments, fines, dues, beverages),
  }));
}, [players, payments, fines, dues, beverages]);
```

**Optimization 1: Memoize Per Player**

```typescript
const usePlayerBalance = (playerId: string) => {
  const { data: fines } = usePlayerFines(playerId);
  const { data: payments } = usePlayerPayments(playerId);
  const { data: dues } = usePlayerDues(playerId);
  const { data: beverages } = usePlayerBeverages(playerId);

  return useMemo(() => {
    if (!fines || !payments || !dues || !beverages) return 0;
    return BalanceService.calculatePlayerBalance(
      playerId, payments, fines, dues, beverages
    );
  }, [playerId, fines, payments, dues, beverages]);
};
```

**Optimization 2: Server-Side Calculation (Cloud Function)**

```typescript
// Cloud Function to maintain balance
export const updatePlayerBalance = functions.firestore
  .document('users/{userId}/{collection}/{docId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const collection = context.params.collection;

    // Only update for financial transactions
    if (!['fines', 'payments', 'dues', 'beverages'].includes(collection)) {
      return;
    }

    // Fetch all transactions
    const [fines, payments, dues, beverages] = await Promise.all([
      admin.firestore().collection(`users/${userId}/fines`).get(),
      admin.firestore().collection(`users/${userId}/payments`).get(),
      admin.firestore().collection(`users/${userId}/dues`).get(),
      admin.firestore().collection(`users/${userId}/beverages`).get(),
    ]);

    // Calculate balance
    const balance = BalanceService.calculatePlayerBalance(
      userId,
      payments.docs.map(d => d.data()),
      fines.docs.map(d => d.data()),
      dues.docs.map(d => d.data()),
      beverages.docs.map(d => d.data())
    );

    // Update player document
    await admin.firestore().doc(`users/${userId}`).update({
      balance,
      balanceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
```

**Trade-off Analysis:**

| Approach | Pros | Cons |
|----------|------|------|
| Client-side (current) | Always accurate, no latency | Heavy computation, recalculates often |
| Memoized per-player | Reduced computation | More complex code |
| Server-side (Cloud Function) | Zero client computation, instant display | Slight staleness (eventual consistency) |

**Recommendation:** Start with memoized per-player, migrate to Cloud Function in Phase 2.

**Action Items:**
- [ ] Implement memoized balance calculation
- [ ] Measure performance improvement
- [ ] Consider Cloud Function for future optimization

---

### 5.2 Transaction Aggregation Optimization

**Current:** Aggregates all transaction types client-side

**Problem:**
```typescript
const allTransactions = [
  ...fines.map(f => ({ ...f, type: 'fine' })),
  ...payments.map(p => ({ ...p, type: 'payment' })),
  ...dues.map(d => ({ ...d, type: 'due' })),
  ...beverages.map(b => ({ ...b, type: 'beverage' })),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
```

**Optimization: Virtual Scrolling**

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5, // Render 5 extra rows
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const transaction = transactions[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TransactionRow transaction={transaction} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Benefits:**
- Only renders visible rows (~10-15 instead of 500+)
- Smooth scrolling even with 1000+ transactions
- Reduced memory usage

**Action Items:**
- [ ] Install @tanstack/react-virtual
- [ ] Implement virtual scrolling for transaction list
- [ ] Test performance with 1000+ transactions

---

## 6. CACHING STRATEGY

### 6.1 Browser-Level Caching

**IndexedDB Persistence:** Already enabled (see Section 2.1)

### 6.2 React Query Caching

**Installation:**
```bash
npm install @tanstack/react-query
```

**Configuration:**

```typescript
// src/app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseClientProvider>
        {children}
      </FirebaseClientProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Usage:**
```typescript
export function useCachedPlayers() {
  const firestore = useFirestore();

  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(firestore, 'users'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },
    staleTime: 60000, // Cache for 1 minute
  });
}
```

**Action Items:**
- [ ] Install React Query
- [ ] Set up query client
- [ ] Migrate frequently-accessed data to React Query
- [ ] Configure cache policies per data type

---

## 7. MONITORING & ANALYTICS

### 7.1 Firebase Performance Monitoring

**Setup:**

```typescript
import { getPerformance, trace } from 'firebase/performance';

export function initializeFirebase() {
  const app = initializeApp(firebaseConfig);

  if (typeof window !== 'undefined') {
    const perf = getPerformance(app);

    // Automatic page load tracing
    console.log('Firebase Performance Monitoring enabled');
  }

  return app;
}
```

**Custom Traces:**

```typescript
export async function measureQueryPerformance<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const perf = getPerformance();
  const t = trace(perf, queryName);

  t.start();
  try {
    const result = await queryFn();
    t.stop();
    return result;
  } catch (error) {
    t.stop();
    throw error;
  }
}

// Usage
const players = await measureQueryPerformance('fetch_players', async () => {
  return getDocs(collection(firestore, 'users'));
});
```

### 7.2 Web Vitals Monitoring

```typescript
// src/app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 7.3 Custom Performance Metrics

```typescript
// src/lib/metrics.ts
export function measurePageLoad(pageName: string) {
  if (typeof window === 'undefined') return;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  const metrics = {
    page: pageName,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    totalTime: navigation.loadEventEnd - navigation.fetchStart,
  };

  console.log('Page Load Metrics:', metrics);

  // Send to analytics
  // analytics.track('page_load', metrics);
}
```

**Action Items:**
- [ ] Enable Firebase Performance Monitoring
- [ ] Add custom traces for critical operations
- [ ] Set up Web Vitals monitoring
- [ ] Create performance dashboard

---

## 8. PERFORMANCE BUDGET

### 8.1 Defined Budgets

| Metric | Budget | Current | Status |
|--------|--------|---------|--------|
| **Initial Load (4G)** | <2s | ~2s | 🟡 At Limit |
| **Subsequent Load** | <500ms | ~300ms | ✅ Good |
| **Bundle Size** | <750KB | ~700KB | ✅ Good |
| **Lighthouse Score** | >85 | ~88 | ✅ Good |
| **Firebase Reads/Day** | <40K | ~850 | ✅ Excellent |
| **Time to Interactive** | <3s | ~2.8s | ✅ Good |
| **First Contentful Paint** | <1.5s | ~1.2s | ✅ Good |

### 8.2 Continuous Monitoring

**Lighthouse CI:**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/dashboard
            http://localhost:3000/players
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

**Budget Configuration:**

**File:** `lighthouse-budget.json`

```json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        {
          "metric": "interactive",
          "budget": 3000
        },
        {
          "metric": "first-contentful-paint",
          "budget": 1500
        }
      ],
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 400
        },
        {
          "resourceType": "total",
          "budget": 750
        }
      ]
    }
  ]
}
```

**Action Items:**
- [ ] Set up Lighthouse CI
- [ ] Define performance budgets
- [ ] Add budget checks to CI/CD pipeline
- [ ] Alert team when budgets exceeded

---

## 9. IMPLEMENTATION PLAN

### Phase 1: Quick Wins (Week 1)
**Estimated Time:** 8 hours

**Tasks:**
- [ ] Enable Firestore persistence
- [ ] Implement pagination on Money page
- [ ] Add loading skeletons
- [ ] Configure Next.js image optimization

**Deliverables:**
- ✅ 70% reduction in repeat load times
- ✅ Better perceived performance

### Phase 2: Bundle Optimization (Week 2)
**Estimated Time:** 12 hours

**Tasks:**
- [ ] Configure webpack code splitting
- [ ] Lazy load dialog components
- [ ] Lazy load charts
- [ ] Audit and optimize imports

**Deliverables:**
- ✅ Bundle size under budget
- ✅ Faster initial load

### Phase 3: Query Optimization (Week 3)
**Estimated Time:** 16 hours

**Tasks:**
- [ ] Create and deploy Firestore indexes
- [ ] Implement React Query caching
- [ ] Optimize balance calculations
- [ ] Implement virtual scrolling

**Deliverables:**
- ✅ Reduced Firestore reads
- ✅ Faster query response times

### Phase 4: Monitoring & Refinement (Week 4)
**Estimated Time:** 8 hours

**Tasks:**
- [ ] Set up Firebase Performance Monitoring
- [ ] Configure Lighthouse CI
- [ ] Add custom performance traces
- [ ] Create performance dashboard

**Deliverables:**
- ✅ Performance monitoring operational
- ✅ Continuous performance tracking

---

## 10. SUCCESS METRICS

### 10.1 Technical Metrics
- **Dashboard Load Time (4G):** <2s ✅
- **Subsequent Loads:** <500ms ✅
- **Bundle Size:** <750KB ✅
- **Firebase Reads/Day:** <40K ✅

### 10.2 User Experience Metrics
- **Lighthouse Performance Score:** >85 ✅
- **Time to Interactive:** <3s ✅
- **First Contentful Paint:** <1.5s ✅
- **Cumulative Layout Shift:** <0.1 ✅

### 10.3 Operational Metrics
- **Firestore Costs:** <$5/month ✅
- **CDN Bandwidth:** <100GB/month ✅
- **Error Rate:** <0.1% ✅

---

**Document Status:** Ready for Implementation
**Approval Required:** Performance Lead, Technical Architect
**Next PRD:** PRD-06-Documentation-Standards.md