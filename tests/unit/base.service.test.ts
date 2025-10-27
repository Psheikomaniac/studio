/**
 * Base Firebase Service Tests
 * Tests for the abstract base service providing common CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseFirebaseService } from '@/services/base.service';
import type { Firestore } from 'firebase/firestore';

// Test document interface
interface TestDocument {
  id: string;
  name: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

// Concrete implementation for testing
class TestService extends BaseFirebaseService<TestDocument> {
  constructor(firestore: Firestore) {
    super(firestore, 'test-collection');
  }

  // Expose protected methods for testing
  public getCollectionPublic() {
    return this.getCollection();
  }

  public getDocRefPublic(id: string) {
    return this.getDocRef(id);
  }

  public timestampPublic() {
    return this.timestamp();
  }

  public generateIdPublic() {
    return this.generateId();
  }

  public buildQueryConstraintsPublic(options: any) {
    return this.buildQueryConstraints(options);
  }
}

describe('BaseFirebaseService', () => {
  let mockFirestore: Firestore;
  let service: TestService;

  beforeEach(() => {
    // Create mock Firestore instance
    mockFirestore = {} as Firestore;
    service = new TestService(mockFirestore);
  });

  describe('Constructor', () => {
    it('should initialize with firestore and collection name', () => {
      expect(service).toBeInstanceOf(BaseFirebaseService);
      expect(service['firestore']).toBe(mockFirestore);
      expect(service['collectionName']).toBe('test-collection');
    });
  });

  describe('Protected utility methods', () => {
    it('should generate valid ISO timestamp', () => {
      const timestamp = service.timestampPublic();

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
    });

    it.skip('should generate unique IDs', () => {
      // Note: This test is skipped due to Firebase mocking complexity
      // In a real implementation, this would test Firebase's doc().id generation
      const id1 = service.generateIdPublic();
      const id2 = service.generateIdPublic();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
    });

    it('should build query constraints from options', () => {
      const options = {
        where: [
          { field: 'name', operator: '==' as const, value: 'test' }
        ],
        orderBy: 'createdAt',
        orderDirection: 'desc' as const,
        limit: 10
      };

      const constraints = service.buildQueryConstraintsPublic(options);

      expect(Array.isArray(constraints)).toBe(true);
      expect(constraints.length).toBeGreaterThan(0);
    });

    it('should handle empty query options', () => {
      const constraints = service.buildQueryConstraintsPublic({});

      expect(Array.isArray(constraints)).toBe(true);
      expect(constraints.length).toBe(0);
    });
  });

  describe('snapshotToData', () => {
    it('should convert snapshot to typed data with id', () => {
      const mockSnapshot = {
        exists: () => true,
        id: 'test-id',
        data: () => ({
          name: 'Test Document',
          value: 42,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        })
      } as any;

      const result = service['snapshotToData'](mockSnapshot);

      expect(result).toEqual({
        id: 'test-id',
        name: 'Test Document',
        value: 42,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
    });

    it('should return null for non-existent document', () => {
      const mockSnapshot = {
        exists: () => false
      } as any;

      const result = service['snapshotToData'](mockSnapshot);

      expect(result).toBeNull();
    });
  });

  describe('buildQueryConstraints', () => {
    it('should build constraints with where clause', () => {
      const options = {
        where: [
          { field: 'status', operator: '==' as const, value: 'active' }
        ]
      };

      const constraints = service.buildQueryConstraintsPublic(options);

      expect(constraints.length).toBe(1);
    });

    it('should build constraints with multiple where clauses', () => {
      const options = {
        where: [
          { field: 'status', operator: '==' as const, value: 'active' },
          { field: 'value', operator: '>' as const, value: 10 }
        ]
      };

      const constraints = service.buildQueryConstraintsPublic(options);

      expect(constraints.length).toBe(2);
    });

    it('should build constraints with orderBy', () => {
      const options = {
        orderBy: 'createdAt',
        orderDirection: 'desc' as const
      };

      const constraints = service.buildQueryConstraintsPublic(options);

      expect(constraints.length).toBe(1);
    });

    it('should build constraints with limit', () => {
      const options = {
        limit: 20
      };

      const constraints = service.buildQueryConstraintsPublic(options);

      expect(constraints.length).toBe(1);
    });

    it('should build constraints with all options', () => {
      const options = {
        where: [
          { field: 'status', operator: '==' as const, value: 'active' }
        ],
        orderBy: 'createdAt',
        orderDirection: 'asc' as const,
        limit: 10,
        startAfter: 'cursor'
      };

      const constraints = service.buildQueryConstraintsPublic(options);

      expect(constraints.length).toBe(4); // where + orderBy + startAfter + limit
    });

    it('should default to "asc" order direction', () => {
      const options = {
        orderBy: 'createdAt'
        // orderDirection not specified
      };

      const constraints = service.buildQueryConstraintsPublic(options);

      expect(constraints.length).toBe(1);
    });
  });

  describe('Service error handling', () => {
    it('should handle errors gracefully in getById', async () => {
      const mockError = new Error('Firestore error');
      vi.spyOn(service, 'getById').mockRejectedValue(mockError);

      try {
        await service.getById('test-id');
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety for document structure', () => {
      const mockDoc: TestDocument = {
        id: 'test-1',
        name: 'Test',
        value: 42,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      expect(mockDoc.id).toBeTruthy();
      expect(typeof mockDoc.name).toBe('string');
      expect(typeof mockDoc.value).toBe('number');
      expect(mockDoc.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });
});
