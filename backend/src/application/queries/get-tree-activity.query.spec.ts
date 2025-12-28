/**
 * Query Handler Tests: Get Tree Activity
 * 
 * Tests for:
 * - Pagination validation
 * - Tree existence check
 * - Empty activity handling
 * - Proper DTO mapping
 */

import { GetTreeActivityHandler, GetTreeActivityQuery } from './get-tree-activity.query';
import type { AuditLogRepository, AuditLogEntry } from '../../infrastructure/repositories/audit-log.repository';
import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

// Mock repositories
class MockAuditLogRepository implements AuditLogRepository {
  async append(entry: AuditLogEntry): Promise<void> {
    // No-op for query tests
  }
}

class MockGenealogyGraphRepository implements GenealogyGraphRepository {
  async findById(treeId: string) {
    if (treeId === 'nonexistent') return null;
    return {
      treeId,
      getPerson: () => null,
    } as any;
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

describe('GetTreeActivityHandler', () => {
  let handler: GetTreeActivityHandler;
  let auditRepo: MockAuditLogRepository;
  let genealogyRepo: MockGenealogyGraphRepository;

  beforeEach(() => {
    auditRepo = new MockAuditLogRepository();
    genealogyRepo = new MockGenealogyGraphRepository();
    handler = new GetTreeActivityHandler(auditRepo, genealogyRepo);
  });

  describe('execute', () => {
    it('should reject tree if it does not exist', async () => {
      const query: GetTreeActivityQuery = {
        treeId: 'nonexistent',
        limit: 50,
        offset: 0,
      };

      await expect(handler.execute(query)).rejects.toThrow('Tree not found');
    });

    it('should return empty activity for valid tree', async () => {
      const query: GetTreeActivityQuery = {
        treeId: 'valid-tree',
        limit: 50,
        offset: 0,
      };

      const result = await handler.execute(query);

      expect(result.treeId).toBe('valid-tree');
      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should validate limit is between 1 and 1000', async () => {
      const invalidLimitQuery: GetTreeActivityQuery = {
        treeId: 'valid-tree',
        limit: 0,
        offset: 0,
      };

      await expect(handler.execute(invalidLimitQuery)).rejects.toThrow(
        'Limit must be between 1 and 1000',
      );
    });

    it('should validate limit does not exceed 1000', async () => {
      const invalidLimitQuery: GetTreeActivityQuery = {
        treeId: 'valid-tree',
        limit: 1001,
        offset: 0,
      };

      await expect(handler.execute(invalidLimitQuery)).rejects.toThrow(
        'Limit must be between 1 and 1000',
      );
    });

    it('should validate offset is non-negative', async () => {
      const invalidOffsetQuery: GetTreeActivityQuery = {
        treeId: 'valid-tree',
        limit: 50,
        offset: -1,
      };

      await expect(handler.execute(invalidOffsetQuery)).rejects.toThrow('Offset must be >= 0');
    });

    it('should use default limit if not provided', async () => {
      const query: GetTreeActivityQuery = {
        treeId: 'valid-tree',
      };

      const result = await handler.execute(query);

      expect(result.limit).toBe(50);
    });

    it('should use default offset if not provided', async () => {
      const query: GetTreeActivityQuery = {
        treeId: 'valid-tree',
      };

      const result = await handler.execute(query);

      expect(result.offset).toBe(0);
    });
  });
});
