/**
 * Audit Chain Verification Service
 * 
 * ⚠️ ADMIN/OFFLINE USE ONLY ⚠️
 * 
 * This service performs full-chain verification of audit logs, which is:
 * - **EXPENSIVE**: Fetches all entries for a tree/person (unbounded query).
 * - **NOT FOR PRODUCTION REQUEST PATHS**: Do NOT call verifyTreeChain() or verifyPersonHistoryChain()
 *   in request handlers. These are admin tools for periodic audits and forensic analysis.
 * - **USE IN**: Background jobs, CLI commands, admin dashboards, scheduled verification tasks.
 * 
 * verifyRecentEntries() is lighter-weight and suitable for periodic monitoring, but still should
 * not be in hot request paths.
 * 
 * GUARANTEES:
 * - Detects single-entry tampering (entry hash mismatch)
 * - Detects chain break (previousHash link broken)
 * - Detects reordering (timestamp order matches chain order)
 * - Detects gap (missing entries in sequence)
 * 
 * NOT GUARANTEED:
 * - Comprehensive history (entries before hash chain implementation lack hashes)
 * - Detection of deleted entries (hash chain only validates existing entries)
 * - Defense against admin tampering (can rewrite entire chain in database)
 * 
 * See PHASE_7_IMPLEMENTATION.md for Trust Model and Threat Model details.
 */

import type { AuditLogRepository, AuditLogEntry } from '../../infrastructure/repositories';
import { verifyEntryHash, verifyChainLink, verifyChainSequence } from '../../domain/services/audit-hash.service';

export class AuditChainVerificationService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Verify a single entry's hash is correct.
   */
  verifyEntryIntegrity(entry: AuditLogEntry): { valid: boolean; reason?: string } {
    // Pre-integrity entries (no hash) are assumed valid
    if (!entry.entryHash) {
      return { valid: true, reason: 'Pre-integrity entry (no hash)' };
    }

    if (!verifyEntryHash(entry)) {
      return { valid: false, reason: 'Entry hash mismatch (possible tampering)' };
    }

    return { valid: true };
  }

  /**
   * ⚠️ ADMIN TOOL - DO NOT CALL IN REQUEST HANDLERS ⚠️
   * 
   * Verify a tree's entire audit chain from genesis to present.
   * Fetches ALL entries for the tree (expensive operation - O(tree_size)).
   * 
   * USAGE:
   * - Background job (e.g., nightly audit verification)
   * - CLI command (manual forensic analysis)
   * - Admin dashboard (non-production environments)
   * 
   * NEVER call this in:
   * - Request handlers (API endpoints)
   * - Real-time validation paths
   * - High-frequency monitoring
   * 
   * Returns:
   * - valid: whether entire chain is sound
   * - errors: list of indices and reasons for failures
   * - stats: chain statistics (length, coverage, pre-integrity entries)
   */
  async verifyTreeChain(treeId: string): Promise<{
    valid: boolean;
    errors: Array<{ index: number; reason: string }>;
    stats: {
      totalEntries: number;
      integrityEntries: number; // entries with entryHash
      preIntegrityEntries: number; // entries without entryHash (migrated)
      chainErrors: number;
    };
  }> {
    // Fetch all entries for this tree in chronological order (genesis to present)
    const page = await this.auditLogRepository.findByTree(treeId, 10000, 0);
    
    // Reverse to oldest-first (findByTree returns newest-first)
    const entries = page.entries.reverse();
    
    // Separate integrity entries from pre-integrity entries
    const integrityEntries = entries.filter((e) => e.entryHash !== undefined);
    const preIntegrityEntries = entries.filter((e) => !e.entryHash);
    
    // Verify chain of integrity entries only
    const verification = verifyChainSequence(integrityEntries);
    
    return {
      valid: verification.valid,
      errors: verification.errors,
      stats: {
        totalEntries: entries.length,
        integrityEntries: integrityEntries.length,
        preIntegrityEntries: preIntegrityEntries.length,
        chainErrors: verification.errors.length,
      },
    };
  }

  /**
   * ⚠️ ADMIN TOOL - DO NOT CALL IN REQUEST HANDLERS ⚠️
   * 
   * Verify a person's change history chain.
   * Fetches all entries related to the person (potentially expensive).
   * 
   * USAGE:
   * - Background job (forensic analysis for specific person)
   * - Admin dashboard (review person's audit trail)
   * - CLI command (manual investigation)
   * 
   * See verifyTreeChain() warnings above.
   */
  async verifyPersonHistoryChain(treeId: string, personId: string): Promise<{
    valid: boolean;
    errors: Array<{ index: number; reason: string }>;
    stats: {
      totalEntries: number;
      integrityEntries: number;
      preIntegrityEntries: number;
    };
  }> {
    const page = await this.auditLogRepository.findByPerson(treeId, personId, 10000, 0);
    
    // Reverse to oldest-first
    const entries = page.entries.reverse();
    
    const integrityEntries = entries.filter((e) => e.entryHash !== undefined);
    const preIntegrityEntries = entries.filter((e) => !e.entryHash);
    
    // Verify chain of integrity entries
    const verification = verifyChainSequence(integrityEntries);
    
    return {
      valid: verification.valid,
      errors: verification.errors,
      stats: {
        totalEntries: entries.length,
        integrityEntries: integrityEntries.length,
        preIntegrityEntries: preIntegrityEntries.length,
      },
    };
  }

  /**
   * Quick health check: verify most recent N entries for a tree.
   * Useful for periodic monitoring without full chain traversal (O(N) instead of O(tree_size)).
   * 
   * Lighter-weight than verifyTreeChain(), but still recommended for:
   * - Background monitoring jobs (hourly/daily verification)
   * - Health check endpoints (not user-facing)
   * - Dashboard data (refreshed periodically, not on-demand)
   * 
   * Still should not be in hot request paths or called for every user action.
   */
  async verifyRecentEntries(treeId: string, limit: number = 100): Promise<{
    valid: boolean;
    errors: Array<{ index: number; reason: string }>;
    entriesChecked: number;
  }> {
    const page = await this.auditLogRepository.findByTree(treeId, limit, 0);
    
    // Reverse to oldest-first
    const entries = page.entries.reverse();
    
    const integrityEntries = entries.filter((e) => e.entryHash !== undefined);
    const verification = verifyChainSequence(integrityEntries);
    
    return {
      valid: verification.valid,
      errors: verification.errors,
      entriesChecked: entries.length,
    };
  }
}
