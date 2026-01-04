/**
 * Query Handler Tests: Get Person History
 * 
 * Tests for:
 * - Pagination validation
 * - Tree and person existence check
 * - Empty history handling
 * - Proper DTO mapping
 * - Person filtering
 */

import { GetPersonHistoryHandler, GetPersonHistoryQuery } from './get-person-history.query';
import type { AuditLogRepository, AuditLogEntry } from '../../infrastructure/repositories/audit-log.repository';
import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

// Mock repositories
class MockAuditLogRepository implements AuditLogRepository {
  async ensureIndexes(): Promise<void> {
    // No-op for tests
  }

  async append(entry: AuditLogEntry): Promise<void> {
    // No-op for query tests
  }

  async findByTree(treeId: string, limit: number, offset: number) {
    return { entries: [], total: 0 };
  }

  async findByPerson(treeId: string, personId: string, limit: number, offset: number) {
    return { entries: [], total: 0 };
  }
}

class MockGenealogyGraphRepository implements GenealogyGraphRepository {
  private trees: Map<string, any> = new Map();

  constructor() {
    this.trees.set('valid-tree', {
      treeId: 'valid-tree',
      getPerson: (personId: string) => {
        if (personId === 'valid-person') {
          return { personId, name: 'John Doe' };
        }
        return null;
      },
    });
  }

  async findById(treeId: string) {
    return this.trees.get(treeId) || null;
  }

  async save() {
    // No-op
  }

  async getSnapshot(): Promise<any> {
    return null;
  }

  async listTreesForUser(): Promise<any[]> {
    return [];
  }
}

describe('GetPersonHistoryHandler', () => {
  let handler: GetPersonHistoryHandler;
  let auditRepo: MockAuditLogRepository;
  let genealogyRepo: MockGenealogyGraphRepository;

  beforeEach(() => {
    auditRepo = new MockAuditLogRepository();
    genealogyRepo = new MockGenealogyGraphRepository();
    handler = new GetPersonHistoryHandler(auditRepo, genealogyRepo);
  });

  describe('execute', () => {
    it('should reject if tree does not exist', async () => {
      const query: GetPersonHistoryQuery = {
        treeId: 'nonexistent',
        personId: 'valid-person',
        limit: 50,
        offset: 0,
      };

      await expect(handler.execute(query)).rejects.toThrow('Tree not found');
    });

    it('should reject if person does not exist', async () => {
      const query: GetPersonHistoryQuery = {
        treeId: 'valid-tree',
        personId: 'nonexistent-person',
        limit: 50,
        offset: 0,
      };

      await expect(handler.execute(query)).rejects.toThrow('Person not found');
    });

    it('should return empty history for valid person', async () => {
      const query: GetPersonHistoryQuery = {
        treeId: 'valid-tree',
        personId: 'valid-person',
        limit: 50,
        offset: 0,
      };

      const result = await handler.execute(query);

      expect(result.treeId).toBe('valid-tree');
      expect(result.personId).toBe('valid-person');
      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should validate limit is between 1 and 1000', async () => {
      const invalidLimitQuery: GetPersonHistoryQuery = {
        treeId: 'valid-tree',
        personId: 'valid-person',
        limit: 0,
        offset: 0,
      };

      await expect(handler.execute(invalidLimitQuery)).rejects.toThrow(
        'Limit must be between 1 and 1000',
      );
    });

    it('should validate limit does not exceed 1000', async () => {
      const invalidLimitQuery: GetPersonHistoryQuery = {
        treeId: 'valid-tree',
        personId: 'valid-person',
        limit: 1001,
        offset: 0,
      };

      await expect(handler.execute(invalidLimitQuery)).rejects.toThrow(
        'Limit must be between 1 and 1000',
      );
    });

    it('should validate offset is non-negative', async () => {
      const invalidOffsetQuery: GetPersonHistoryQuery = {
        treeId: 'valid-tree',
        personId: 'valid-person',
        limit: 50,
        offset: -1,
      };

      await expect(handler.execute(invalidOffsetQuery)).rejects.toThrow('Offset must be >= 0');
    });

    it('should use default limit if not provided', async () => {
      const query: GetPersonHistoryQuery = {
        treeId: 'valid-tree',
        personId: 'valid-person',
      };

      const result = await handler.execute(query);

      expect(result.limit).toBe(50);
    });

    it('should use default offset if not provided', async () => {
      const query: GetPersonHistoryQuery = {
        treeId: 'valid-tree',
        personId: 'valid-person',
      };

      const result = await handler.execute(query);

      expect(result.offset).toBe(0);
    });
  });
});
