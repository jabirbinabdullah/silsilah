/**
 * Audit & Activity DTOs
 * 
 * Response DTOs for activity log and change history endpoints.
 * Minimal transformation of backend audit log entries.
 */

/**
 * Audit log entry DTO (response)
 * 
 * Represents a single audit log entry with actor information and timestamp.
 * Preserves raw action string for frontend classification.
 */
export interface AuditLogEntryDto {
  /**
   * Unique entry identifier
   */
  id: string;

  /**
   * Tree this entry belongs to
   */
  treeId: string;

  /**
   * Action string (raw backend format)
   * Examples: "create-person", "establish-parent-child", "update-tree"
   */
  action: string;

  /**
   * User who performed the action
   */
  actor: {
    userId: string;
    username: string;
    role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'UNKNOWN';
  };

  /**
   * When the action occurred (ISO 8601)
   */
  timestamp: string;
}

/**
 * Tree activity response DTO
 * 
 * Paginated view of all changes to a family tree.
 */
export interface TreeActivityResponseDto {
  /**
   * Tree identifier
   */
  treeId: string;

  /**
   * Activity entries (chronologically ordered)
   */
  entries: AuditLogEntryDto[];

  /**
   * Total entries in tree activity (before pagination)
   */
  total: number;

  /**
   * Pagination metadata
   */
  pagination: {
    /**
     * Requested page size
     */
    limit: number;

    /**
     * Requested offset
     */
    offset: number;

    /**
     * Whether more entries exist
     */
    hasMore: boolean;
  };
}

/**
 * Person history response DTO
 * 
 * Paginated view of all changes to a specific person.
 */
export interface PersonHistoryResponseDto {
  /**
   * Tree identifier
   */
  treeId: string;

  /**
   * Person identifier
   */
  personId: string;

  /**
   * Change history entries (chronologically ordered)
   */
  entries: AuditLogEntryDto[];

  /**
   * Total entries in person history (before pagination)
   */
  total: number;

  /**
   * Pagination metadata
   */
  pagination: {
    /**
     * Requested page size
     */
    limit: number;

    /**
     * Requested offset
     */
    offset: number;

    /**
     * Whether more entries exist
     */
    hasMore: boolean;
  };
}

/**
 * Empty history response
 * 
 * Used when no activity exists for a tree or person.
 */
export interface EmptyHistoryResponseDto {
  treeId: string;
  entries: [];
  total: 0;
  pagination: {
    limit: number;
    offset: number;
    hasMore: false;
  };
}
