# N+1 Query Problem - Migration Guide

Complete guide for eliminating N+1 query anti-patterns in balanceUp.

---

## 🎯 What is the N+1 Problem?

**Anti-Pattern (BAD):**
```typescript
// 1 query to get fines
const fines = await getDocs(collection(db, 'fines')); // 1 read

// N queries to get users (one per fine!)
for (const fine of fines.docs) {
  const user = await getDoc(doc(db, 'users', fine.data().userId)); // N reads
  console.log(`${user.data().name} owes ${fine.data().amount}`);
}

// Result: 1 + N Firestore reads (100 fines = 101 reads!)
```

**Optimized (GOOD):**
```typescript
// 1 query to get fines
const fines = await getDocs(collection(db, 'fines')); // 1 read

// 1 batch query to get all users at once
const userIds = fines.docs.map(f => f.data().userId);
const users = await batchFetchByIds(db, 'users', userIds); // ~4 reads (30 items per batch)

// In-memory join
fines.docs.forEach(fine => {
  const user = users.get(fine.data().userId);
  console.log(`${user.name} owes ${fine.data().amount}`);
});

// Result: 1 + 4 = 5 reads (95% reduction!)
```

---

## 📋 Migration Strategies

### Strategy 1: Batch Fetching (Recommended)

Use when you need fresh data and can afford slight denormalization overhead.

**Before:**
```typescript
// ❌ N+1 Problem
async function getFinesWithUsers() {
  const finesSnapshot = await getDocs(collection(db, 'fines'));
  
  const finesWithUsers = [];
  for (const fineDoc of finesSnapshot.docs) {
    const userDoc = await getDoc(doc(db, 'users', fineDoc.data().userId));
    finesWithUsers.push({
      ...fineDoc.data(),
      user: userDoc.data(),
    });
  }
  
  return finesWithUsers;
}
```

**After:**
```typescript
// ✅ Optimized with Batch Fetch
import { batchFetchByIds } from '@/lib/firestore-join';

async function getFinesWithUsers() {
  const finesSnapshot = await getDocs(collection(db, 'fines'));
  const fines = finesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Batch fetch all users
  const userIds = fines.map(f => f.userId);
  const users = await batchFetchByIds(db, 'users', userIds);
  
  // Join in memory
  return fines.map(fine => ({
    ...fine,
    user: users.get(fine.userId),
  }));
}
```

**Performance:**
- Before: 1 + N reads (101 reads for 100 fines)
- After: 1 + ceil(N/30) reads (5 reads for 100 fines)
- **Improvement: 95%** 🎉

---

### Strategy 2: Denormalization (Best Performance)

Use when data changes rarely and you need maximum performance.

**Schema Change:**
```typescript
// Before
interface Fine {
  id: string;
  userId: string; // Just the ID
  amount: number;
}

// After (Denormalized)
interface Fine {
  id: string;
  userId: string;
  userName: string; // ← Embedded!
  userAvatar?: string; // ← Embedded!
  amount: number;
}
```

**Create Fine (with denormalization):**
```typescript
async function createFine(data: CreateFineInput) {
  // Fetch user data once
  const userDoc = await getDoc(doc(db, 'users', data.userId));
  const user = userDoc.data();
  
  // Embed user data in fine
  await addDoc(collection(db, 'fines'), {
    ...data,
    userId: user.id,
    userName: user.name, // Denormalized
    userAvatar: user.avatar, // Denormalized
    createdAt: serverTimestamp(),
  });
}
```

**Display Fines (no joins needed!):**
```typescript
async function getFines() {
  const snapshot = await getDocs(collection(db, 'fines'));
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // No joins needed! User data is already embedded.
}
```

**Performance:**
- Before: 1 + N reads
- After: 1 read (100% elimination!)
- **Improvement: 99%** 🚀

**Tradeoff:**
- ✅ Fastest read performance
- ❌ Data can get stale if user updates (need sync mechanism)

---

### Strategy 3: React Hooks with Caching

Use in React components for automatic caching and re-use.

**Before:**
```typescript
function FinesList() {
  const [fines, setFines] = useState([]);
  const [users, setUsers] = useState({});
  
  useEffect(() => {
    const fetchData = async () => {
      const finesSnap = await getDocs(collection(db, 'fines'));
      setFines(finesSnap.docs.map(d => d.data()));
      
      // N+1 problem!
      for (const fine of finesSnap.docs) {
        const userSnap = await getDoc(doc(db, 'users', fine.data().userId));
        setUsers(prev => ({
          ...prev,
          [fine.data().userId]: userSnap.data()
        }));
      }
    };
    
    fetchData();
  }, []);
  
  return (
    <div>
      {fines.map(fine => (
        <div key={fine.id}>
          {users[fine.userId]?.name} owes {fine.amount}
        </div>
      ))}
    </div>
  );
}
```

**After:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { useBatchUsers } from '@/hooks/useBatchFetch';

function FinesList() {
  // Fetch fines
  const { data: fines } = useQuery(['fines'], async () => {
    const snapshot = await getDocs(collection(db, 'fines'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
  
  // Batch fetch users (automatically cached!)
  const userIds = fines?.map(f => f.userId) ?? [];
  const { data: users } = useBatchUsers(userIds);
  
  return (
    <div>
      {fines?.map(fine => (
        <div key={fine.id}>
          {users?.get(fine.userId)?.name} owes {fine.amount}
        </div>
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic caching (users fetched once, reused everywhere)
- ✅ Loading states handled by React Query
- ✅ No manual state management

---

## 🔧 Migration Checklist

### Step 1: Audit Your Code

Find all N+1 patterns:

```bash
# Search for sequential getDoc calls in loops
grep -r "for.*getDoc" src/
grep -r "forEach.*getDoc" src/
grep -r "map.*getDoc" src/
```

**Common Patterns:**
- ✅ Fines + Users
- ✅ Payments + Users
- ✅ Beverage Consumptions + Users + Beverages
- ✅ Due Payments + Users + Dues

### Step 2: Choose Strategy

| Use Case | Strategy | Performance |
|----------|----------|-------------|
| Data changes often | Batch Fetching | 95% improvement |
| Data rarely changes | Denormalization | 99% improvement |
| React components | Hooks + Caching | 95% + reusability |

### Step 3: Implement Fixes

**Example: Fines Service**

```typescript
// src/services/fines.ts

// ❌ OLD (N+1 problem)
export async function getFinesWithUsers() {
  const fines = await getDocs(collection(db, 'fines'));
  
  const result = [];
  for (const fine of fines.docs) {
    const user = await getDoc(doc(db, 'users', fine.data().userId));
    result.push({
      ...fine.data(),
      user: user.data(),
    });
  }
  
  return result;
}

// ✅ NEW (Optimized)
import { batchFetchByIds } from '@/lib/firestore-join';

export async function getFinesWithUsers() {
  const snapshot = await getDocs(collection(db, 'fines'));
  const fines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const userIds = fines.map(f => f.userId);
  const users = await batchFetchByIds(db, 'users', userIds);
  
  return fines.map(fine => ({
    ...fine,
    user: users.get(fine.userId),
  }));
}
```

### Step 4: Test Performance

**Before:**
```typescript
console.time('getFines');
const fines = await getFinesWithUsers();
console.timeEnd('getFines');
// getFines: 2534ms
```

**After:**
```typescript
console.time('getFines');
const fines = await getFinesWithUsers();
console.timeEnd('getFines');
// getFines: 127ms (95% faster!)
```

---

## 📊 Real-World Examples

### Example 1: Fines List with Users

**Component:**
```typescript
'use client';

import { useTeamPaginatedQuery } from '@/hooks/usePaginatedQuery';
import { useBatchUsers } from '@/hooks/useBatchFetch';

export function FinesList({ teamId }: { teamId: string }) {
  // Paginated fines
  const { data: finesPages } = useTeamPaginatedQuery<Fine>('fines', teamId, 50);
  
  const fines = finesPages?.pages.flatMap(p => p.docs) ?? [];
  const userIds = [...new Set(fines.map(f => f.userId))];
  
  // Batch fetch users (1 query for all users!)
  const { data: users } = useBatchUsers(userIds);
  
  return (
    <div>
      {fines.map(fine => {
        const user = users?.get(fine.userId);
        return (
          <div key={fine.id}>
            {user?.name} owes ${fine.amount}
          </div>
        );
      })}
    </div>
  );
}
```

### Example 2: Beverage Consumptions (Multi-Join)

```typescript
import { useMultiJoin } from '@/hooks/useBatchFetch';

export function BeverageConsumptionsList({ consumptions }) {
  // Join with both users AND beverages
  const { data: enriched } = useMultiJoin(
    consumptions,
    [
      { field: 'userId', collection: 'users', as: 'user' },
      { field: 'beverageId', collection: 'beverages', as: 'beverage' },
    ]
  );
  
  return (
    <div>
      {enriched?.map(item => (
        <div key={item.id}>
          {item.user.name} drank {item.quantity}x {item.beverage.name}
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Firestore Reads | 1 + N | 1 + ceil(N/30) | 95% reduction |
| Page Load Time | 2-5s | <300ms | <500ms |
| Monthly Cost | $50 | $2.50 | <$5 |

---

## 🔗 Tools & Utilities

**Available Utilities:**
- `batchFetchByIds()` - Batch fetch documents by IDs
- `joinCollections()` - LEFT JOIN two collections
- `multiJoin()` - Join multiple collections
- `denormalize()` - Create denormalized copies

**Available Hooks:**
- `useBatchFetch()` - Generic batch fetching
- `useBatchUsers()` - Batch fetch users (specialized)
- `useJoinCollection()` - Join with caching
- `useMultiJoin()` - Multi-join with caching

---

## 📚 References

- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [N+1 Query Problem](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem)
- [Data Denormalization](https://cloud.google.com/firestore/docs/best-practices#denormalization)

---

**Status:** ✅ Utilities Ready | ⏳ Migration Pending
**Next Steps:** Migrate services one by one, test performance
