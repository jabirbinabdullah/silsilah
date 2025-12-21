import type { UserRole } from '../../domain/types';

export interface AuditLogEntry {
  treeId: string;
  action: string;
  userId: string;
  username: string;
  role: UserRole | 'UNKNOWN';
  timestamp: Date;
}

export interface AuditLogRepository {
  append(entry: AuditLogEntry): Promise<void>;
}
