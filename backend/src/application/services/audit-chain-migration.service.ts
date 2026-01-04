/**
 * Audit Chain Migration Service
 * 
 * One-time migration to add hashes to existing entries.
 * Best-effort, idempotent, clearly marked entries as "pre-integrity".
 * 
 * STRATEGY:
 * 1. Fetch all entries for a tree in chronological order (oldest first)
 * 2. For each entry, compute entryHash with previousHash from prior entry
 * 3. Update entry with hashes; mark as migrated
 * 4. Safe to run multiple times (detects already-migrated entries)
 * 
 * LIMITATIONS:
 * - Computationally expensive for trees with millions of entries
 * - Should be run offline or during low-traffic periods
 * - Does NOT re-hash pre-migration entries (those retain verified=undefined)
 */

import type { MongoClient } from 'mongodb';
import { hashEntryWithChain, toCanonical } from '../../domain/services/audit-hash.service';
import type { AuditLogEntry } from '../../infrastructure/repositories';

export class AuditChainMigrationService {
  constructor(private mongoClient: MongoClient, private dbName: string = 'silsilah') {}

  /**
   * Migrate a single tree's audit log to include hashes.
   * 
   * Returns:
   * - migrated: number of entries that were updated
   * - skipped: number of entries already hashed
   * - errors: any errors encountered
   */
  async migrateTreeChain(treeId: string): Promise<{
    migrated: number;
    skipped: number;
    errors: string[];
  }> {
    const db = this.mongoClient.db(this.dbName);
    const collection = db.collection('audit_logs');
    
    const errors: string[] = [];
    let migrated = 0;
    let skipped = 0;
    
    // Fetch all entries for this tree in chronological order
    const entries = await collection
      .find({ treeId })
      .sort({ timestamp: 1, _id: 1 })
      .toArray();
    
    if (entries.length === 0) {
      return { migrated, skipped, errors };
    }
    
    let previousHash: string | undefined;
    
    for (const doc of entries) {
      try {
        // Skip already-migrated entries (have entryHash)
        if (doc.entryHash) {
          skipped++;
          previousHash = doc.entryHash;
          continue;
        }
        
        // Build canonical form with chain link
        const canonical = {
          treeId: doc.treeId,
          personId: doc.personId,
          personIds: doc.personIds,
          action: doc.action,
          userId: doc.userId,
          username: doc.username,
          role: doc.role,
          timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp,
          details: doc.details,
          previousHash,
        };
        
        // Compute hash
        const entryHash = hashEntryWithChain(canonical);
        
        // Update entry
        await collection.updateOne(
          { _id: doc._id },
          {
            $set: {
              entryHash,
              previousHash,
              verified: undefined, // Mark as pre-integrity (migrated)
            },
          }
        );
        
        migrated++;
        previousHash = entryHash;
      } catch (err) {
        errors.push(`Entry ${doc._id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    return { migrated, skipped, errors };
  }

  /**
   * Migrate all trees in the database.
   * 
   * WARNING: This is expensive and should be run during maintenance windows.
   */
  async migrateAllTrees(): Promise<{
    treesProcessed: number;
    totalMigrated: number;
    totalSkipped: number;
    errors: Array<{ tree: string; message: string }>;
  }> {
    const db = this.mongoClient.db(this.dbName);
    const collection = db.collection('audit_logs');
    
    // Fetch unique treeIds
    const treeIds = await collection.distinct('treeId');
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    const migrationErrors: Array<{ tree: string; message: string }> = [];
    
    for (const treeId of treeIds) {
      try {
        const result = await this.migrateTreeChain(treeId);
        totalMigrated += result.migrated;
        totalSkipped += result.skipped;
        if (result.errors.length > 0) {
          migrationErrors.push({
            tree: treeId,
            message: `Errors migrating entries: ${result.errors.join('; ')}`,
          });
        }
      } catch (err) {
        migrationErrors.push({
          tree: treeId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    
    return {
      treesProcessed: treeIds.length,
      totalMigrated,
      totalSkipped,
      errors: migrationErrors,
    };
  }
}
