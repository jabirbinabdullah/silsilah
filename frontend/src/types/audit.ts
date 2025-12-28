/**
 * Audit & Activity Log Types
 * 
 * Represents audit log entries from backend.
 * Matches backend AuditLogEntryDto structure.
 */

export interface AuditLogEntry {
  id: string;
  treeId: string;
  action: string;
  actor: {
    userId: string;
    username: string;
    role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'UNKNOWN';
  };
  timestamp: string; // ISO8601 format
}

export interface TreeActivityResponse {
  treeId: string;
  entries: AuditLogEntry[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface PersonHistoryResponse {
  treeId: string;
  personId: string;
  entries: AuditLogEntry[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Human-readable action labels for audit entries
 */
export const ACTION_LABELS: Record<string, string> = {
  'CREATE_FAMILY_TREE': 'Created family tree',
  'CREATE_PERSON': 'Added person',
  'ESTABLISH_PARENT_CHILD': 'Established parent-child relationship',
  'ESTABLISH_SPOUSE': 'Established spouse relationship',
  'REMOVE_RELATIONSHIP': 'Removed relationship',
  'REMOVE_PERSON': 'Removed person',
  'IMPORT_PERSONS': 'Imported persons',
  'ADD_MEMBER': 'Added member',
  'REMOVE_MEMBER': 'Removed member',
  'CHANGE_MEMBER_ROLE': 'Changed member role',
  'TRANSFER_OWNERSHIP': 'Transferred ownership',
} as const;

/**
 * Get human-readable label for an action
 */
export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').toLowerCase();
}

/**
 * Get emoji icon for an action type
 */
export function getActionIcon(action: string): string {
  const iconMap: Record<string, string> = {
    'CREATE_PERSON': '👤',
    'ESTABLISH_PARENT_CHILD': '👨‍👧‍👦',
    'ESTABLISH_SPOUSE': '💑',
    'REMOVE_RELATIONSHIP': '💔',
    'REMOVE_PERSON': '🗑️',
    'IMPORT_PERSONS': '📥',
    'CREATE_FAMILY_TREE': '🌳',
    'ADD_MEMBER': '➕',
    'REMOVE_MEMBER': '➖',
    'CHANGE_MEMBER_ROLE': '⚙️',
    'TRANSFER_OWNERSHIP': '👑',
  };
  return iconMap[action] || '📝';
}

/**
 * Get color for an action type (Bootstrap-compatible)
 */
export function getActionColor(action: string): string {
  const colorMap: Record<string, string> = {
    'CREATE_PERSON': '#28a745', // green - success
    'CREATE_FAMILY_TREE': '#28a745', // green
    'ESTABLISH_PARENT_CHILD': '#0d6efd', // blue - info
    'ESTABLISH_SPOUSE': '#17a2b8', // cyan - info
    'IMPORT_PERSONS': '#0d6efd', // blue
    'ADD_MEMBER': '#198754', // green
    'CHANGE_MEMBER_ROLE': '#fd7e14', // orange - warning
    'TRANSFER_OWNERSHIP': '#fd7e14', // orange
    'REMOVE_RELATIONSHIP': '#dc3545', // red - danger
    'REMOVE_PERSON': '#dc3545', // red - danger
    'REMOVE_MEMBER': '#dc3545', // red - danger
  };
  return colorMap[action] || '#555555';
}
