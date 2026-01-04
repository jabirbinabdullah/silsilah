/**
 * Audit Hash Service
 * 
 * Deterministic canonicalization and SHA-256 hashing for audit logs.
 * Provides hash chaining and verification primitives.
 * 
 * Design principles:
 * - Deterministic: same input → same hash (sortable keys, consistent encoding)
 * - Immutable: hash reflects complete entry state at time of creation
 * - Chainable: each entry references previous entry's hash
 * - Verifiable: can reconstruct and verify chain without external keys
 */

import * as crypto from 'crypto';
import type { AuditLogEntry } from '../../infrastructure/repositories';

/**
 * Canonical form of an audit log entry for hashing.
 * Excludes hash fields to prevent circular hashing.
 * Fields are sorted for deterministic JSON serialization.
 */
export interface AuditLogCanonical {
  treeId: string;
  personId?: string;
  personIds?: string[];
  action: string;
  userId: string;
  username: string;
  role: string;
  timestamp: string; // ISO 8601
  details?: Record<string, unknown>;
  previousHash?: string; // hash of previous entry (undefined for genesis)
}

/**
 * Extract canonical form from audit entry for hashing.
 * Explicitly omits entryHash and verified fields.
 */
export function toCanonical(entry: AuditLogEntry): AuditLogCanonical {
  return {
    treeId: entry.treeId,
    personId: entry.personId,
    personIds: entry.personIds,
    action: entry.action,
    userId: entry.userId,
    username: entry.username,
    role: entry.role,
    timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
    details: entry.details,
    // previousHash is NOT included here; it's part of the entry but not part of ITS hash
  };
}

/**
 * Deterministic JSON serialization: sorted keys, minimal spacing.
 * Order: treeId, personId, personIds, action, userId, username, role, timestamp, details, previousHash
 */
export function canonicalJSON(canonical: AuditLogCanonical): string {
  const obj: Record<string, any> = {
    treeId: canonical.treeId,
    personId: canonical.personId,
    personIds: canonical.personIds,
    action: canonical.action,
    userId: canonical.userId,
    username: canonical.username,
    role: canonical.role,
    timestamp: canonical.timestamp,
  };
  
  // Only include optional fields if present
  if (canonical.details !== undefined) {
    obj.details = canonical.details;
  }
  if (canonical.previousHash !== undefined) {
    obj.previousHash = canonical.previousHash;
  }
  
  // JSON.stringify with sorted keys (replacer function)
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Compute SHA-256 hash of canonical entry.
 * Returns lowercase hex string.
 */
export function hashEntry(canonical: AuditLogCanonical): string {
  const json = canonicalJSON(canonical);
  return crypto.createHash('sha256').update(json, 'utf-8').digest('hex');
}

/**
 * Compute hash of entry with forward chaining.
 * If previousHash is provided, includes it in the hash computation for chain binding.
 */
export function hashEntryWithChain(canonical: AuditLogCanonical): string {
  return hashEntry(canonical);
}

/**
 * Verify that an entry's hash is correct given its canonical form.
 */
export function verifyEntryHash(entry: AuditLogEntry): boolean {
  if (!entry.entryHash) return false;
  
  const canonical = toCanonical(entry);
  const computed = hashEntry(canonical);
  
  return computed === entry.entryHash;
}

/**
 * Verify chain link: does this entry's previousHash match the previous entry's entryHash?
 */
export function verifyChainLink(current: AuditLogEntry, previous: AuditLogEntry): boolean {
  // Genesis check: previous should not exist for first entry
  if (!previous) {
    return current.previousHash === undefined;
  }
  
  // Non-genesis: previousHash must match previous entry's entryHash
  if (!current.previousHash || !previous.entryHash) {
    return false;
  }
  
  return current.previousHash === previous.entryHash;
}

/**
 * Verify full chain continuity for a sequence of entries.
 * Returns true if all entries hash correctly and chain links are valid.
 */
export function verifyChainSequence(entries: AuditLogEntry[]): {
  valid: boolean;
  errors: Array<{ index: number; reason: string }>;
} {
  const errors: Array<{ index: number; reason: string }> = [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Verify this entry's hash
    if (!verifyEntryHash(entry)) {
      errors.push({ index: i, reason: `Entry hash mismatch` });
    }
    
    // Verify chain link to previous entry
    const previous = i > 0 ? entries[i - 1] : undefined;
    if (!verifyChainLink(entry, previous!)) {
      errors.push({ index: i, reason: `Chain link broken to previous entry` });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Genesis entry: first entry in a tree's audit log.
 * Has no previousHash.
 */
export function isGenesisEntry(entry: AuditLogEntry): boolean {
  return !entry.previousHash;
}
