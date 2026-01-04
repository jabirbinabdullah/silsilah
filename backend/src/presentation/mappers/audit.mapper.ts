import type { AuditLogEntry } from '../../infrastructure/repositories';
import type { AuditLogEntryDto } from '../dtos/audit.dto';

export function toAuditLogEntryDto(entry: AuditLogEntry): AuditLogEntryDto {
  return {
    id: entry.id ?? `${entry.treeId}-${entry.timestamp.getTime()}`,
    treeId: entry.treeId,
    action: entry.action,
    actor: {
      userId: entry.userId,
      username: entry.username,
      role: entry.role,
    },
    timestamp: entry.timestamp.toISOString(),
  };
}

export function mapAuditEntries(entries: AuditLogEntry[]): AuditLogEntryDto[] {
  return entries.map(toAuditLogEntryDto);
}
