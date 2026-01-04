import { ObjectId, type Collection, type MongoClient } from 'mongodb';
import type { AuditLogEntry, AuditLogRepository, AuditLogPage } from './audit-log.repository';
import { hashEntryWithChain, toCanonical } from '../../domain/services/audit-hash.service';

interface AuditLogDocument {
  _id?: ObjectId;
  treeId: string;
  personId?: string;
  personIds?: string[];
  action: string;
  userId: string;
  username: string;
  role: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  
  /**
   * SHA-256 hash of this entry's canonical form.
   */
  entryHash?: string;
  
  /**
   * Hash of the previous entry in the chain.
   */
  previousHash?: string;
  
  /**
   * Verification status: undefined (pre-integrity), true (verified), or false (tampered).
   */
  verified?: boolean;
}

export class MongoAuditLogRepository implements AuditLogRepository {
  private collection: Collection<AuditLogDocument>;

  constructor(mongoClient: MongoClient, dbName: string = 'silsilah') {
    this.collection = mongoClient.db(dbName).collection<AuditLogDocument>('audit_logs');
  }

  /**
   * Ensure required indexes exist on the audit_logs collection.
   * This method is idempotent and safe to call multiple times.
   * 
   * INDEX STRATEGY
   * ==============
   * 
   * Three indexes support the full audit query pattern:
   * 
   * 1. { treeId: 1, timestamp: -1 } (idx_treeId_timestamp)
   *    - Covers: findByTree(treeId, limit, offset)
   *    - Query pattern: db.audit_logs.find({treeId}).sort({timestamp: -1})
   *    - MongoDB explain: Index scan covers filter + sort (COLLSCAN not needed)
   *    - Use case: Activity feed, audit log browser
   *
   * 2. { personId: 1, timestamp: -1 } (idx_personId_timestamp)
   *    - Covers: findByPerson() for single personId
   *    - Query pattern: db.audit_logs.find({personId}).sort({timestamp: -1})
   *    - MongoDB explain: Index scan covers filter + sort
   *    - Use case: Person change history
   *    - Note: $or queries with personIds array still require collection scan for some branches
   *
   * 3. { treeId: 1, timestamp: 1 } (idx_treeId_timestamp_asc)
   *    - Covers: verifyTreeChain() chain traversal in chronological order
   *    - Query pattern: db.audit_logs.find({treeId}).sort({timestamp: 1})
   *    - MongoDB explain: Index scan covers filter + sort (genesis to present order)
   *    - Use case: Verification service, hash chain validation
   *    - Critical for: Forward-walking the chain without in-memory sorting
   * 
   * INDEX COVERAGE ANALYSIS
   * =======================
   * 
   * findByTree queries:
   * - Filter: {treeId: 1} ✓ Covered by all three indexes
   * - Sort: {timestamp: -1} ✓ Covered by idx_treeId_timestamp (descending)
   * - Combined: {treeId: 1, timestamp: -1} ✓ COVERED INDEX (efficient)
   * - Result: Zero document fetches needed (index-only scan possible for projected fields)
   * 
   * findByPerson queries:
   * - Simple case: {personId, treeId} + sort ✓ Covered by idx_personId_timestamp
   * - Complex case: {$or: [personId, personIds]} → Not fully covered (requires collection scan for $or)
   * - Result: Partial coverage; $or queries less efficient but still acceptable
   * 
   * Chain verification queries:
   * - Filter: {treeId: 1} ✓ Covered by idx_treeId_timestamp_asc
   * - Sort: {timestamp: 1} ✓ Ascending index avoids in-memory sort
   * - Combined: {treeId: 1, timestamp: 1} ✓ COVERED INDEX
   * - Result: Efficient chain traversal without explicit sorting
   */
  async ensureIndexes(): Promise<void> {
    const requiredIndexes: Array<{ spec: Record<string, 1 | -1>; name: string; description: string }> = [
      {
        spec: { treeId: 1, timestamp: -1 },
        name: 'idx_treeId_timestamp',
        description: 'Tree activity queries (sorted by recency)',
      },
      {
        spec: { personId: 1, timestamp: -1 },
        name: 'idx_personId_timestamp',
        description: 'Person history queries (sorted by recency)',
      },
      {
        spec: { treeId: 1, timestamp: 1 },
        name: 'idx_treeId_timestamp_asc',
        description: 'Chain traversal (oldest to newest)',
      },
    ];

    for (const { spec, name, description } of requiredIndexes) {
      try {
        await this.collection.createIndex(spec as any, { name });
        console.log(`[AUDIT] Repository: Index ensured: ${name} - ${description}`);
      } catch (err) {
        if ((err as any).codeName === 'IndexAlreadyExists') {
          console.log(`[AUDIT] Repository: Index already exists: ${name}`);
        } else {
          console.warn(`[AUDIT] Repository: Failed to create index ${name}:`, err);
        }
      }
    }
  }

  async append(entry: AuditLogEntry): Promise<void> {
    // Fetch previous entry (most recent) for this tree to establish chain link
    const previousDoc = await this.collection
      .findOne({ treeId: entry.treeId }, { sort: { timestamp: -1, _id: -1 } });
    
    const previousEntry = previousDoc ? this.toEntry(previousDoc) : undefined;
    
    // Build canonical form with previousHash if there's a previous entry
    const canonical = toCanonical(entry);
    if (previousEntry?.entryHash) {
      canonical.previousHash = previousEntry.entryHash;
    }
    
    // Compute hash with chain binding
    const entryHash = hashEntryWithChain(canonical);
    
    // Document to insert
    const doc: AuditLogDocument = {
      treeId: entry.treeId,
      personId: entry.personId,
      personIds: entry.personIds,
      action: entry.action,
      userId: entry.userId,
      username: entry.username,
      role: entry.role,
      timestamp: entry.timestamp,
      details: entry.details,
      entryHash,
      previousHash: canonical.previousHash,
      verified: true, // New entries are marked as verified
    };

    await this.collection.insertOne(doc);
  }

  async findByTree(treeId: string, limit: number, offset: number): Promise<AuditLogPage> {
    const filter = { treeId };
    const total = await this.collection.countDocuments(filter);
    const docs = await this.collection
      .find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      total,
      entries: docs.map((doc) => this.toEntry(doc)),
    };
  }

  async findByPerson(treeId: string, personId: string, limit: number, offset: number): Promise<AuditLogPage> {
    const filter = {
      treeId,
      $or: [{ personId }, { personIds: personId }],
    } as any;

    const total = await this.collection.countDocuments(filter);
    const docs = await this.collection
      .find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      total,
      entries: docs.map((doc) => this.toEntry(doc)),
    };
  }

  private toEntry(doc: AuditLogDocument): AuditLogEntry {
    return {
      id: doc._id?.toString() ?? '',
      treeId: doc.treeId,
      personId: doc.personId,
      personIds: doc.personIds,
      action: doc.action,
      userId: doc.userId,
      username: doc.username,
      role: doc.role as AuditLogEntry['role'],
      timestamp: doc.timestamp,
      details: doc.details,
      entryHash: doc.entryHash,
      previousHash: doc.previousHash,
      verified: doc.verified,
    };
  }
}
