/**
 * Audit Chain Verification Service - Test Suite
 * 
 * Tests verify the integrity detection service:
 * - Single entry tampering detection
 * - Chain breakage detection
 * - Tree-wide verification
 * - Person history verification
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AuditChainVerificationService } from '../src/application/services/audit-chain-verification.service';
import type { AuditLogRepository, AuditLogEntry } from '../src/infrastructure/repositories';

describe('AuditChainVerificationService', () => {
  let mockRepository: AuditLogRepository;
  let service: AuditChainVerificationService;

  beforeEach(() => {
    mockRepository = {
      append: jest.fn(),
      findByTree: jest.fn(),
      findByPerson: jest.fn(),
      ensureIndexes: jest.fn(),
    };
    service = new AuditChainVerificationService(mockRepository);
  });

  describe('verifyEntryIntegrity', () => {
    it('accepts pre-integrity entries (no hash)', () => {
      const entry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        // No entryHash (pre-integrity)
      };

      const result = service.verifyEntryIntegrity(entry);
      expect(result.valid).toBe(true);
    });

    it('detects hash mismatch', () => {
      const entry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'wrong_hash',
      };

      const result = service.verifyEntryIntegrity(entry);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('tamper');
    });
  });

  describe('verifyTreeChain', () => {
    it('verifies tree with no entries', async () => {
      jest.mocked(mockRepository.findByTree).mockResolvedValue({
        entries: [],
        total: 0,
      });

      const result = await service.verifyTreeChain('tree1');
      expect(result.valid).toBe(true);
      expect(result.stats.totalEntries).toBe(0);
    });

    it('tracks pre-integrity and integrity entries separately', async () => {
      const preIntegrityEntry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        // No hash
      };

      const integrityEntry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:01:00Z'),
        entryHash: 'hash2',
        previousHash: undefined,
        verified: true,
      };

      // Mock returns newest-first, service reverses to oldest-first
      jest.mocked(mockRepository.findByTree).mockResolvedValue({
        entries: [integrityEntry, preIntegrityEntry],
        total: 2,
      });

      const result = await service.verifyTreeChain('tree1');
      expect(result.stats.totalEntries).toBe(2);
      expect(result.stats.preIntegrityEntries).toBe(1);
      expect(result.stats.integrityEntries).toBe(1);
    });
  });

  describe('verifyPersonHistoryChain', () => {
    it('verifies person history', async () => {
      const entry: AuditLogEntry = {
        treeId: 'tree1',
        personId: 'person1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'hash1',
      };

      jest.mocked(mockRepository.findByPerson).mockResolvedValue({
        entries: [entry],
        total: 1,
      });

      const result = await service.verifyPersonHistoryChain('tree1', 'person1');
      expect(result.stats.totalEntries).toBe(1);
      expect(result.stats.integrityEntries).toBe(1);
    });
  });

  describe('verifyRecentEntries', () => {
    it('checks recent entries without full chain traversal', async () => {
      const entries: AuditLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        treeId: 'tree1',
        action: `ACTION_${i}`,
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date(2025, 0, 4, 12, 0, i),
        entryHash: `hash${i}`,
        previousHash: i > 0 ? `hash${i - 1}` : undefined,
        verified: true,
      }));

      jest.mocked(mockRepository.findByTree).mockResolvedValue({
        entries,
        total: 500,
      });

      const result = await service.verifyRecentEntries('tree1', 100);
      expect(result.entriesChecked).toBe(50);
      expect(result.valid).toBe(true);
    });
  });
});
