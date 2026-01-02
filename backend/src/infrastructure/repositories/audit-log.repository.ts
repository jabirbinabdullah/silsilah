import type { UserRole } from '../../domain/types';

export interface AuditLogEntry {
  id?: string;
  treeId: string;
  personId?: string;
  personIds?: string[];
  action: string;
  userId: string;
  username: string;
  role: UserRole | 'UNKNOWN';
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  total: number;
}

export interface AuditLogRepository {
  append(entry: AuditLogEntry): Promise<void>;
  findByTree(treeId: string, limit: number, offset: number): Promise<AuditLogPage>;
  findByPerson(treeId: string, personId: string, limit: number, offset: number): Promise<AuditLogPage>;
}
