import type { Collection, MongoClient } from 'mongodb';
import type { AuditLogEntry, AuditLogRepository } from './audit-log.repository';

interface AuditLogDocument {
  _id?: string;
  treeId: string;
  action: string;
  userId: string;
  username: string;
  role: string;
  timestamp: Date;
}

export class MongoAuditLogRepository implements AuditLogRepository {
  private collection: Collection<AuditLogDocument>;

  constructor(mongoClient: MongoClient, dbName: string = 'silsilah') {
    this.collection = mongoClient.db(dbName).collection<AuditLogDocument>('audit_logs');
  }

  async append(entry: AuditLogEntry): Promise<void> {
    const doc: AuditLogDocument = {
      treeId: entry.treeId,
      action: entry.action,
      userId: entry.userId,
      username: entry.username,
      role: entry.role,
      timestamp: entry.timestamp,
    };

    await this.collection.insertOne(doc);
  }
}
