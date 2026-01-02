import { ObjectId, type Collection, type MongoClient } from 'mongodb';
import type { AuditLogEntry, AuditLogRepository, AuditLogPage } from './audit-log.repository';

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
   * Indexes created:
   * - { treeId: 1, timestamp: -1 }: Supports tree activity queries
   * - { personId: 1, timestamp: -1 }: Supports person history queries
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
    };
  }
}
