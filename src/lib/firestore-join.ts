/**
 * Firestore Join Utilities
 * 
 * Provides utilities for efficiently joining Firestore collections
 * and avoiding N+1 query anti-patterns.
 * 
 * Strategy:
 * 1. Batch fetching (fetch multiple docs in single query)
 * 2. In-memory joining (avoid sequential queries)
 * 3. Caching for repeated joins
 */

import {
  collection,
  query,
  where,
  documentId,
  getDocs,
  Query,
  DocumentData,
  Firestore,
} from 'firebase/firestore';

/**
 * Chunk array into smaller arrays
 * Firestore 'in' queries support max 30 items
 */
export function chunkArray<T>(arr: T[], size: number = 30): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Batch fetch documents by IDs
 * Efficiently fetches multiple documents in batches
 * 
 * @param firestore - Firestore instance
 * @param collectionName - Collection name
 * @param ids - Array of document IDs
 * @returns Map of id -> document data
 * 
 * @example
 * ```typescript
 * const userIds = fines.map(f => f.userId);
 * const users = await batchFetchByIds(firestore, 'users', userIds);
 * 
 * fines.forEach(fine => {
 *   const user = users.get(fine.userId);
 *   console.log(`${fine.amount} for ${user.name}`);
 * });
 * ```
 */
export async function batchFetchByIds<T extends { id: string }>(
  firestore: Firestore,
  collectionName: string,
  ids: string[]
): Promise<Map<string, T>> {
  if (ids.length === 0) {
    return new Map();
  }

  // Remove duplicates
  const uniqueIds = [...new Set(ids)];
  
  const results = new Map<string, T>();
  
  // Chunk IDs (Firestore 'in' supports max 30 items)
  const chunks = chunkArray(uniqueIds, 30);
  
  // Fetch all chunks in parallel
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(
        collection(firestore, collectionName),
        where(documentId(), 'in', chunk)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        results.set(doc.id, {
          id: doc.id,
          ...doc.data(),
        } as T);
      });
    })
  );
  
  return results;
}

/**
 * Join two collections
 * Performs a LEFT JOIN-like operation
 * 
 * @param mainDocs - Main documents
 * @param joinField - Field in main docs containing foreign key
 * @param joinCollection - Collection to join with
 * @param firestore - Firestore instance
 * @returns Main documents with joined data
 * 
 * @example
 * ```typescript
 * const fines = await getDocs(collection(firestore, 'fines'));
 * 
 * const finesWithUsers = await joinCollections(
 *   fines.docs.map(doc => ({ id: doc.id, ...doc.data() })),
 *   'userId',
 *   'users',
 *   firestore
 * );
 * 
 * // Now each fine has a `user` property
 * finesWithUsers.forEach(fine => {
 *   console.log(`${fine.user.name} owes ${fine.amount}`);
 * });
 * ```
 */
export async function joinCollections<
  TMain extends Record<string, any>,
  TJoin extends { id: string }
>(
  mainDocs: TMain[],
  joinField: keyof TMain,
  joinCollection: string,
  firestore: Firestore
): Promise<Array<TMain & { joined?: TJoin }>> {
  if (mainDocs.length === 0) {
    return [];
  }

  // Extract foreign keys
  const foreignKeys = mainDocs
    .map(doc => doc[joinField])
    .filter(Boolean) as string[];

  // Batch fetch joined documents
  const joinedData = await batchFetchByIds<TJoin>(
    firestore,
    joinCollection,
    foreignKeys
  );

  // Merge joined data
  return mainDocs.map(doc => ({
    ...doc,
    joined: joinedData.get(doc[joinField] as string),
  }));
}

/**
 * Multi-join utility
 * Joins multiple collections at once
 * 
 * @example
 * ```typescript
 * const fines = await getDocs(collection(firestore, 'fines'));
 * 
 * const enriched = await multiJoin(
 *   fines.docs.map(doc => ({ id: doc.id, ...doc.data() })),
 *   [
 *     { field: 'userId', collection: 'users', as: 'user' },
 *     { field: 'teamId', collection: 'teams', as: 'team' },
 *   ],
 *   firestore
 * );
 * 
 * enriched.forEach(fine => {
 *   console.log(`${fine.user.name} in ${fine.team.name}`);
 * });
 * ```
 */
export async function multiJoin<TMain extends Record<string, any>>(
  mainDocs: TMain[],
  joins: Array<{
    field: keyof TMain;
    collection: string;
    as: string;
  }>,
  firestore: Firestore
): Promise<Array<TMain & Record<string, any>>> {
  if (mainDocs.length === 0 || joins.length === 0) {
    return mainDocs;
  }

  // Fetch all joins in parallel
  const joinPromises = joins.map(async ({ field, collection: collectionName, as }) => {
    const foreignKeys = mainDocs
      .map(doc => doc[field])
      .filter(Boolean) as string[];
    
    const data = await batchFetchByIds(
      firestore,
      collectionName,
      foreignKeys
    );
    
    return { field, as, data };
  });

  const joinResults = await Promise.all(joinPromises);

  // Merge all joined data
  return mainDocs.map(doc => {
    const enriched = { ...doc };
    
    joinResults.forEach(({ field, as, data }) => {
      (enriched as Record<string, unknown>)[as] = data.get(doc[field] as string);
    });
    
    return enriched;
  });
}

/**
 * Denormalize helper
 * Creates denormalized copy of document with embedded foreign data
 * 
 * @param doc - Main document
 * @param foreignKey - Foreign key field
 * @param foreignDoc - Foreign document to embed
 * @param fields - Fields to copy from foreign doc
 * @returns Denormalized document
 * 
 * @example
 * ```typescript
 * const user = await getDoc(doc(firestore, 'users', fine.userId));
 * 
 * const denormalized = denormalize(
 *   fine,
 *   'userId',
 *   user.data(),
 *   ['name', 'avatar', 'email']
 * );
 * 
 * // Result:
 * // {
 * //   ...fine,
 * //   userId: 'user-123',
 * //   userName: 'John Doe',
 * //   userAvatar: 'https://...',
 * //   userEmail: 'john@example.com'
 * // }
 * ```
 */
export function denormalize<TMain, TForeign>(
  doc: TMain,
  foreignKey: string,
  foreignDoc: TForeign | undefined,
  fields: (keyof TForeign)[]
): TMain & Record<string, any> {
  if (!foreignDoc) {
    return doc as TMain & Record<string, any>;
  }

  const denormalized = { ...doc } as TMain & Record<string, any>;
  
  // Extract foreign key prefix (e.g., 'userId' -> 'user')
  const prefix = foreignKey.replace(/Id$/, '');
  
  // Copy fields with prefix
  fields.forEach(field => {
    const denormKey = `${prefix}${String(field).charAt(0).toUpperCase()}${String(field).slice(1)}`;
    (denormalized as Record<string, unknown>)[denormKey] = foreignDoc[field];
  });
  
  return denormalized;
}
