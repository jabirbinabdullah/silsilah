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
  
  /**
   * Hash of this entry's canonical form (includes previousHash if present).
   * Computed at append time; immutable afterward.
   */
  entryHash?: string;
  
  /**
   * Hash of the previous entry in the chain.
   * Undefined for genesis entry; binds this entry to the prior state.
   */
  previousHash?: string;
  
  /**
   * Verification status. Undefined = pre-integrity (migrated entry); true = verified; false = tampered.
   * Used to distinguish entries that existed before hash chaining was implemented.
   */
  verified?: boolean;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  total: number;
}

export interface AuditLogRepository {
  append(entry: AuditLogEntry): Promise<void>;
  findByTree(treeId: string, limit: number, offset: number): Promise<AuditLogPage>;
  findByPerson(treeId: string, personId: string, limit: number, offset: number): Promise<AuditLogPage>;
  ensureIndexes(): Promise<void>;
}
