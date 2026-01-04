/**
 * Audit Hash Service - Comprehensive Test Suite
 * 
 * Tests cover:
 * - Hash determinism (same input = same hash)
 * - Chain continuity (each entry properly linked)
 * - Tamper detection (modified entry detected)
 * - Genesis handling (first entry has no previousHash)
 * - Ordering guarantees (entries in chronological order)
 */

import { describe, it, expect } from '@jest/globals';
import {
  toCanonical,
  canonicalJSON,
  hashEntry,
  verifyEntryHash,
  verifyChainLink,
  verifyChainSequence,
  isGenesisEntry,
} from '../src/domain/services/audit-hash.service';
import type { AuditLogEntry } from '../src/infrastructure/repositories';
import type { UserRole } from '../src/domain/types';

describe('AuditHashService', () => {
  describe('Deterministic canonicalization', () => {
    it('produces identical JSON for identical inputs', () => {
      const entry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        details: { name: 'Bob' },
      };

      const canonical1 = toCanonical(entry);
      const canonical2 = toCanonical(entry);

      expect(canonicalJSON(canonical1)).toBe(canonicalJSON(canonical2));
    });

    it('ignores field order in input', () => {
      const entry1: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
      };

      const entry2: AuditLogEntry = {
        username: 'Alice',
        userId: 'user1',
        action: 'CREATE_PERSON',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        treeId: 'tree1',
        role: 'OWNER',
      };

      expect(canonicalJSON(toCanonical(entry1))).toBe(canonicalJSON(toCanonical(entry2)));
    });

    it('excludes hash fields from canonical form', () => {
      const entry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'oldHashValue',
        verified: true,
      };

      const canonical = toCanonical(entry);
      const json = canonicalJSON(canonical);

      expect(json).not.toContain('oldHashValue');
      expect(json).not.toContain('verified');
    });
  });

  describe('Hash computation', () => {
    it('computes consistent hash for same entry', () => {
      const canonical = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: '2025-01-04T12:00:00Z',
      };

      const hash1 = hashEntry(canonical);
      const hash2 = hashEntry(canonical);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('produces different hashes for different inputs', () => {
      const canonical1 = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: '2025-01-04T12:00:00Z',
      };

      const canonical2 = {
        ...canonical1,
        userId: 'user2',
      };

      const hash1 = hashEntry(canonical1);
      const hash2 = hashEntry(canonical2);

      expect(hash1).not.toBe(hash2);
    });

    it('includes previousHash in chain computation', () => {
      const canonical1 = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: '2025-01-04T12:00:00Z',
      };

      const canonical2 = {
        ...canonical1,
        previousHash: 'abc123',
      };

      const hash1 = hashEntry(canonical1);
      const hash2 = hashEntry(canonical2);

      expect(hash1).not.toBe(hash2); // Chain link affects hash
    });
  });

  describe('Entry hash verification', () => {
    it('verifies correct entry hash', () => {
      const canonical = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: '2025-01-04T12:00:00Z',
      };

      const entryHash = hashEntry(canonical);

      const entry: AuditLogEntry = {
        ...canonical,
        timestamp: new Date(canonical.timestamp),
        entryHash,
        role: canonical.role as UserRole,
      };

      expect(verifyEntryHash(entry)).toBe(true);
    });

    it('detects tampered entry', () => {
      const canonical = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: '2025-01-04T12:00:00Z',
      };

      const entryHash = hashEntry(canonical);

      const entry: AuditLogEntry = {
        ...canonical,
        timestamp: new Date(canonical.timestamp),
        entryHash,
        username: 'Bob', // Tampered
        role: canonical.role as UserRole,
      };

      expect(verifyEntryHash(entry)).toBe(false);
    });

    it('accepts entry without hash (pre-integrity)', () => {
      const entry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        // No entryHash
      };

      expect(verifyEntryHash(entry)).toBe(false); // No hash to verify
    });
  });

  describe('Chain link verification', () => {
    it('verifies genesis entry (no previousHash)', () => {
      const genesis: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'hash1',
        // No previousHash
      };

      expect(verifyChainLink(genesis, undefined as any)).toBe(true);
    });

    it('verifies chain link between entries', () => {
      const entry1: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'hash1',
      };

      const entry2: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:01:00Z'),
        entryHash: 'hash2',
        previousHash: 'hash1', // Links to entry1
      };

      expect(verifyChainLink(entry2, entry1)).toBe(true);
    });

    it('detects broken chain link', () => {
      const entry1: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'hash1',
      };

      const entry2: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:01:00Z'),
        entryHash: 'hash2',
        previousHash: 'wrong_hash', // Does not match entry1.entryHash
      };

      expect(verifyChainLink(entry2, entry1)).toBe(false);
    });
  });

  describe('Full chain sequence verification', () => {
    it('verifies valid chain', () => {
      const entry1: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'hash1',
      };

      const entry2: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:01:00Z'),
        entryHash: 'hash2',
        previousHash: 'hash1',
      };

      const result = verifyChainSequence([entry1, entry2]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects tampering in chain', () => {
      const canonical1 = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: '2025-01-04T12:00:00Z',
      };

      const hash1 = hashEntry(canonical1);

      const entry1: AuditLogEntry = {
        ...canonical1,
        timestamp: new Date(canonical1.timestamp),
        entryHash: hash1,
        role: canonical1.role as UserRole,
      };

      // Tampered entry2
      const entry2: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Bob', // Tampered but hash not recomputed
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:01:00Z'),
        entryHash: 'hash2',
        previousHash: hash1,
      };

      const result = verifyChainSequence([entry1, entry2]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('detects chain break', () => {
      const entry1: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'hash1',
      };

      const entry2: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:01:00Z'),
        entryHash: 'hash2',
        previousHash: 'wrong_hash',
      };

      const result = verifyChainSequence([entry1, entry2]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: { index: number; reason: string }) => e.reason.includes('Chain link'))).toBe(true);
    });
  });

  describe('Genesis entry detection', () => {
    it('identifies genesis entry', () => {
      const entry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_TREE',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:00:00Z'),
        entryHash: 'hash1',
        // No previousHash
      };

      expect(isGenesisEntry(entry)).toBe(true);
    });

    it('identifies non-genesis entry', () => {
      const entry: AuditLogEntry = {
        treeId: 'tree1',
        action: 'CREATE_PERSON',
        userId: 'user1',
        username: 'Alice',
        role: 'OWNER',
        timestamp: new Date('2025-01-04T12:01:00Z'),
        entryHash: 'hash2',
        previousHash: 'hash1',
      };

      expect(isGenesisEntry(entry)).toBe(false);
    });
  });

  describe('Ordering guarantees', () => {
    it('preserves chronological order in sequence verification', () => {
      const entries: AuditLogEntry[] = [];
      let previousHash: string | undefined;

      for (let i = 0; i < 5; i++) {
        const canonical = {
          treeId: 'tree1',
          action: `ACTION_${i}`,
          userId: 'user1',
          username: 'Alice',
          role: 'OWNER',
          timestamp: new Date(2025, 0, 4, 12, 0, i).toISOString(),
          previousHash,
        };

        const entryHash = hashEntry(canonical);

        const entry: AuditLogEntry = {
          ...canonical,
          timestamp: new Date(canonical.timestamp),
          entryHash,
          role: canonical.role as UserRole,
        };

        entries.push(entry);
        previousHash = entryHash;
      }

      const result = verifyChainSequence(entries);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
