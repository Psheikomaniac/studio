# Firebase Service Layer

This directory contains the service layer for Firebase Firestore operations. The service layer provides a clean abstraction over Firestore, making it easier to work with data throughout the application.

## Architecture

The service layer follows these principles:

1. **Separation of Concerns**: Business logic is separated from UI components
2. **Type Safety**: All operations are fully typed with TypeScript
3. **Consistent Error Handling**: All operations return `ServiceResult<T>` for uniform error handling
4. **Reusability**: Common CRUD operations are inherited from `BaseFirebaseService`
5. **Testability**: Services can be easily mocked for testing

## Directory Structure

```
services/
├── base.service.ts    # Abstract base class with common CRUD operations
├── types.ts           # Shared type definitions
├── index.ts           # Barrel exports
├── README.md          # This file
└── [domain]/          # Domain-specific services (to be created)
    ├── player.service.ts
    ├── fine.service.ts
    └── ...
```

## Usage

### Creating a New Service

To create a new service, extend `BaseFirebaseService`:

```typescript
// services/player/player.service.ts
import { BaseFirebaseService } from '../base.service';
import type { Player } from '@/lib/types';
import type { Firestore } from 'firebase/firestore';

export class PlayerService extends BaseFirebaseService<Player> {
  constructor(firestore: Firestore) {
    super(firestore, 'players'); // 'players' is the Firestore collection name
  }

  // Add custom methods specific to players
  async getActivePlayersOnly() {
    return this.getAll({
      where: [{ field: 'active', operator: '==', value: true }],
      orderBy: 'name',
    });
  }
}
```

### Using a Service in a Component

```typescript
import { useFirestore } from '@/firebase';
import { PlayerService } from '@/services/player/player.service';

function MyComponent() {
  const firestore = useFirestore();
  const playerService = useMemo(() => new PlayerService(firestore), [firestore]);

  const loadPlayers = async () => {
    const result = await playerService.getAll({ orderBy: 'name' });
    if (result.success) {
      console.log('Players:', result.data);
    } else {
      console.error('Error:', result.error);
    }
  };

  // ...
}
```

### Creating a Custom Hook

For better reusability, create a custom hook:

```typescript
// services/player/use-player-service.ts
import { useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { PlayerService } from './player.service';

export function usePlayerService() {
  const firestore = useFirestore();
  return useMemo(() => new PlayerService(firestore), [firestore]);
}

// Usage in component
function MyComponent() {
  const playerService = usePlayerService();
  // ...
}
```

## Available Operations

The `BaseFirebaseService` provides these operations out of the box:

### Read Operations

- `getById(id)` - Get a single document by ID
- `getAll(options)` - Get all documents matching query options
- `getPaginated(options)` - Get paginated results
- `exists(id)` - Check if a document exists
- `count(options)` - Count documents matching query

### Write Operations

- `create(data, options)` - Create a new document
- `update(id, data, options)` - Update an existing document
- `delete(id, options)` - Delete a document (soft or hard delete)
- `batchCreate(items, options)` - Batch create multiple documents

### Real-time Operations

- `subscribeToDocument(id, callback)` - Subscribe to document changes
- `subscribeToCollection(options, callback)` - Subscribe to collection changes

## Query Options

All query operations support these options:

```typescript
interface QueryOptions {
  limit?: number;                   // Maximum number of results
  orderBy?: string;                 // Field to sort by
  orderDirection?: 'asc' | 'desc';  // Sort direction
  startAfter?: any;                 // Pagination cursor
  where?: Array<{                   // Filter conditions
    field: string;
    operator: WhereFilterOp;
    value: any;
  }>;
}
```

### Example Queries

```typescript
// Get first 10 players ordered by name
await playerService.getAll({
  limit: 10,
  orderBy: 'name',
  orderDirection: 'asc',
});

// Get players with negative balance
await playerService.getAll({
  where: [
    { field: 'balance', operator: '<', value: 0 }
  ],
  orderBy: 'balance',
  orderDirection: 'asc',
});

// Pagination
const firstPage = await playerService.getPaginated({ limit: 20 });
if (firstPage.success && firstPage.data.hasMore) {
  const secondPage = await playerService.getPaginated({
    limit: 20,
    startAfter: firstPage.data.lastDoc,
  });
}
```

## Error Handling

All service methods return a `ServiceResult<T>`:

```typescript
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}
```

### Handling Results

```typescript
const result = await playerService.create(newPlayer);

if (result.success) {
  console.log('Created player:', result.data);
} else {
  console.error('Error creating player:', result.error);
  // Handle error (show toast, log to error tracking, etc.)
}
```

## Best Practices

1. **Always use ServiceResult**: Check `success` before accessing `data`
2. **Use custom hooks**: Create hooks like `usePlayerService()` for cleaner component code
3. **Memoize services**: Use `useMemo` to avoid recreating service instances
4. **Add domain-specific methods**: Extend base operations with business logic
5. **Document custom methods**: Add JSDoc comments to all public methods
6. **Use TypeScript**: Leverage type safety for all operations

## Real-time Subscriptions

For real-time updates, use the subscription methods:

```typescript
// Subscribe to a single player
const unsubscribe = playerService.subscribeToDocument(
  playerId,
  (player, error) => {
    if (error) {
      console.error('Subscription error:', error);
      return;
    }
    console.log('Player updated:', player);
  }
);

// Clean up subscription when component unmounts
useEffect(() => {
  return () => unsubscribe();
}, []);
```

## Audit Fields

The base service automatically adds these fields:

- `createdAt` - ISO timestamp when document was created
- `updatedAt` - ISO timestamp when document was last updated
- `createdBy` - User ID who created the document (if provided)
- `updatedBy` - User ID who last updated the document (if provided)

## Testing

Services can be easily tested by mocking the Firestore instance:

```typescript
import { PlayerService } from './player.service';

describe('PlayerService', () => {
  it('should create a player', async () => {
    const mockFirestore = createMockFirestore();
    const service = new PlayerService(mockFirestore);
    
    const result = await service.create({
      name: 'Test Player',
      // ...
    });
    
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Test Player');
  });
});
```

## Next Steps

1. Create domain-specific services (PlayerService, FineService, etc.)
2. Add custom business logic methods to each service
3. Create custom hooks for each service
4. Add unit tests for all services
5. Document any complex queries or operations

## Additional Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Testing with Vitest](https://vitest.dev/)
