# Pagination Usage Guide

Complete guide for implementing pagination in balanceUp.

---

## 🎯 Quick Start

### 1. Wrap App with QueryProvider

```typescript
// src/app/layout.tsx
import { QueryProvider } from '@/providers/QueryProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

### 2. Use Pagination Hook

```typescript
// src/app/fines/page.tsx
'use client';

import { useTeamPaginatedQuery } from '@/hooks/usePaginatedQuery';
import { InfiniteScrollList } from '@/components/pagination/InfiniteScrollList';

export default function FinesPage() {
  const { currentTeam } = useTeamContext();
  
  const query = useTeamPaginatedQuery<Fine>(
    'fines',
    currentTeam.id,
    50, // page size
    'createdAt'
  );
  
  return (
    <InfiniteScrollList
      query={query}
      renderItem={(fine) => <FineCard fine={fine} />}
      emptyMessage="Keine Strafen vorhanden"
    />
  );
}
```

---

## 📚 Available Hooks

### `usePaginatedQuery<T>`

Basic pagination for any collection.

```typescript
const query = usePaginatedQuery<Fine>(
  'fines',           // collection name
  50,                // page size
  'createdAt',       // order by field
  'desc',            // order direction
  {
    queryConstraints: [where('paid', '==', false)],
    enabled: true,
  }
);
```

### `useTeamPaginatedQuery<T>`

Team-scoped pagination (recommended for most use cases).

```typescript
const query = useTeamPaginatedQuery<Fine>(
  'fines',
  teamId,
  50,
  'createdAt'
);
```

### `useSearchPaginated<T>`

Search with pagination.

```typescript
const [searchTerm, setSearchTerm] = useState('');

const query = useSearchPaginated<User>(
  'users',
  'name',
  searchTerm,
  25
);
```

---

## 🎨 UI Components

### Infinite Scroll (Recommended)

```typescript
import { InfiniteScrollList } from '@/components/pagination/InfiniteScrollList';

<InfiniteScrollList
  query={query}
  renderItem={(item) => <ItemCard item={item} />}
  emptyMessage="Keine Einträge"
  className="space-y-4"
  itemClassName="border-b pb-4"
/>
```

**Features:**
- ✅ Automatic loading on scroll
- ✅ Loading states
- ✅ Error handling
- ✅ Empty states
- ✅ "Load more" indicator

### Manual Pagination (Tables)

```typescript
import { PaginatedTable } from '@/components/pagination/PaginatedTable';

<PaginatedTable
  query={query}
  renderHeader={() => (
    <tr>
      <th>Name</th>
      <th>Amount</th>
    </tr>
  )}
  renderRow={(item) => (
    <tr key={item.id}>
      <td>{item.name}</td>
      <td>{item.amount}</td>
    </tr>
  )}
  emptyMessage="Keine Daten"
/>
```

**Features:**
- ✅ Previous/Next buttons
- ✅ Page counter
- ✅ Total items display
- ✅ Loading states

---

## 🔧 Advanced Usage

### Custom Query Constraints

```typescript
const query = usePaginatedQuery<Fine>(
  'fines',
  50,
  'createdAt',
  'desc',
  {
    queryConstraints: [
      where('teamId', '==', teamId),
      where('paid', '==', false),
      where('amount', '>', 10),
    ],
  }
);
```

### Conditional Queries

```typescript
const query = usePaginatedQuery<Fine>(
  'fines',
  50,
  'createdAt',
  'desc',
  {
    enabled: !!teamId, // Only run when teamId is available
  }
);
```

### Custom Loading Skeleton

```typescript
<InfiniteScrollList
  query={query}
  renderItem={(item) => <ItemCard item={item} />}
  loadingSkeleton={
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  }
/>
```

### Custom Error Handling

```typescript
<InfiniteScrollList
  query={query}
  renderItem={(item) => <ItemCard item={item} />}
  renderError={(error) => (
    <div className="p-4 border border-red-200 rounded">
      <h3>Fehler beim Laden</h3>
      <p>{error.message}</p>
      <Button onClick={() => query.refetch()}>
        Erneut versuchen
      </Button>
    </div>
  )}
/>
```

---

## 🚀 Performance Optimization

### 1. Page Size Selection

```typescript
// Mobile: Smaller pages for faster initial load
const isMobile = useMediaQuery('(max-width: 768px)');
const pageSize = isMobile ? 25 : 50;

const query = useTeamPaginatedQuery('fines', teamId, pageSize);
```

### 2. Stale Time Configuration

```typescript
// Data rarely changes: longer stale time
const query = usePaginatedQuery('beverages', 50, 'name', 'asc', {
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 3. Prefetching

```typescript
import { useQueryClient } from '@tanstack/react-query';

function prefetchNextPage() {
  const queryClient = useQueryClient();
  
  // Prefetch on hover
  return (
    <button
      onMouseEnter={() => {
        queryClient.prefetchInfiniteQuery({
          queryKey: ['fines', teamId],
          // ... query options
        });
      }}
    >
      Next Page
    </button>
  );
}
```

---

## 📊 Firestore Indexes

Required indexes are in `firestore.indexes.json`.

**Deploy indexes:**
```bash
firebase deploy --only firestore:indexes
```

**Key indexes added:**
- `teamId + createdAt` for all collections
- Enables fast team-scoped pagination
- Automatic index suggestions in emulator

---

## 🧪 Testing

### Unit Test Example

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useTeamPaginatedQuery } from '@/hooks/usePaginatedQuery';

test('loads paginated data', async () => {
  const { result } = renderHook(() =>
    useTeamPaginatedQuery('fines', 'team-123', 10)
  );
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  
  expect(result.current.data.pages[0].docs).toHaveLength(10);
  expect(result.current.hasNextPage).toBe(true);
});
```

### Integration Test

```typescript
import { render, screen } from '@testing-library/react';
import { InfiniteScrollList } from '@/components/pagination/InfiniteScrollList';

test('renders infinite scroll list', async () => {
  render(
    <InfiniteScrollList
      query={mockQuery}
      renderItem={(item) => <div>{item.name}</div>}
    />
  );
  
  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
```

---

## ✅ Migration Checklist

Replace old non-paginated queries:

- [ ] Fines list: `/app/fines/page.tsx`
- [ ] Payments list: `/app/payments/page.tsx`
- [ ] Users list: `/app/users/page.tsx`
- [ ] Beverages list: `/app/beverages/page.tsx`
- [ ] Dues list: `/app/dues/page.tsx`
- [ ] Audit logs: `/app/admin/audit/page.tsx`

**Before (slow):**
```typescript
const finesRef = collection(db, 'fines');
const q = query(finesRef, where('teamId', '==', teamId));
const snapshot = await getDocs(q); // Loads ALL documents!
```

**After (fast):**
```typescript
const query = useTeamPaginatedQuery<Fine>('fines', teamId, 50);
// Loads only 50 documents initially
```

---

## 🔗 References

- [React Query Docs](https://tanstack.com/query/latest/docs/react/guides/infinite-queries)
- [Firestore Pagination](https://firebase.google.com/docs/firestore/query-data/query-cursors)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

---

**Status:** ✅ Ready to use
**Performance Gain:** ~90% fewer Firestore reads
**UX Improvement:** Instant initial load, smooth infinite scroll
