/**
 * Audit View Models
 * 
 * Read-only DTOs for displaying genealogical change history and activity feeds.
 * These are UI-ready transformations of backend audit logs.
 * 
 * PRINCIPLES:
 * - Chronological ordering preserved from source
 * - Groupable by entity (tree, person) but NO pre-grouping
 * - No inference, calculation, or summarization
 * - Raw data passthrough with minimal schema mapping
 * 
 * NON-GUARANTEES:
 * - No completeness guarantee (entries may be missing if logs truncated)
 * - No causality analysis (entries are independent events)
 * - No merge conflict detection (concurrent edits not analyzed)
 * - No data reconstruction (values before/after not guaranteed)
 * - No user resolution (userId may be orphaned if user deleted)
 * 
 * @module auditModels
 */

/**
 * Actor in the genealogy system
 * 
 * User who performed the action.
 * May be orphaned if user account deleted.
 */
export interface AuditActor {
  /** User ID from auth system */
  userId: string;
  
  /** Display name at time of action */
  username: string;
  
  /** User role at time of action (OWNER, EDITOR, VIEWER, UNKNOWN) */
  role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'UNKNOWN';
}

/**
 * Generic audit log entry from backend
 * 
 * Minimal schema: what changed, who changed it, when
 * No field-level deltas or value comparisons.
 */
export interface AuditLogEntryDTO {
  /** Unique identifier for audit record */
  id: string;
  
  /** Family tree being modified */
  treeId: string;
  
  /** Action performed (see AuditActionType) */
  action: string;
  
  /** User who performed action */
  actor: AuditActor;
  
  /** When action occurred (ISO 8601) */
  timestamp: string;
}

/**
 * Metadata about an entity referenced in audit log
 * 
 * Entities can be trees or persons.
 * Entity may be deleted (orphaned reference).
 */
export interface AuditEntityRef {
  /** Entity type: 'TREE' | 'PERSON' | 'RELATIONSHIP' | 'UNKNOWN' */
  type: 'TREE' | 'PERSON' | 'RELATIONSHIP' | 'UNKNOWN';
  
  /** Entity identifier (treeId, personId, relationshipId) */
  id: string;
  
  /** Display name (auto-populated from current state if available) */
  displayName?: string;
  
  /** Whether entity still exists (false = orphaned reference) */
  exists?: boolean;
}

/**
 * UI-Ready Activity Feed Entry
 * 
 * Represents a single action for tree-level activity feeds.
 * Ordered chronologically, no pre-grouping.
 * 
 * USAGE:
 * - Activity feed in tree view
 * - "Recent changes" timeline
 * - User action history
 */
export interface ActivityFeedEntry {
  /** Unique entry ID */
  id: string;
  
  /** When action occurred (ISO 8601) */
  timestamp: string;
  
  /** Who made the change */
  actor: AuditActor;
  
  /** What type of action (see ActionType enum) */
  actionType: AuditActionType;
  
  /** Human-readable action description */
  actionLabel: string;
  
  /** Primary entity affected */
  entity: AuditEntityRef;
  
  /** Secondary entity (if relationship action) */
  relatedEntity?: AuditEntityRef;
  
  /** Tree context */
  treeId: string;
  
  /** Raw action string (for extensibility) */
  rawAction: string;
}

/**
 * UI-Ready Person Change History Entry
 * 
 * All changes to a specific person in chronological order.
 * Grouped by person but entries not pre-aggregated.
 * 
 * USAGE:
 * - Person detail view: "Change history" tab
 * - "What changed about this person?"
 * - Attribution/provenance display
 */
export interface PersonChangeHistoryEntry {
  /** Unique entry ID */
  id: string;
  
  /** When change occurred (ISO 8601) */
  timestamp: string;
  
  /** Who made the change */
  actor: AuditActor;
  
  /** Type of change to person */
  changeType: PersonChangeType;
  
  /** Human-readable change description */
  changeLabel: string;
  
  /** Person affected */
  personId: string;
  personDisplayName?: string;
  
  /** Parent person (if relationship change) */
  relatedPersonId?: string;
  relatedPersonDisplayName?: string;
  relatedRole?: 'PARENT' | 'CHILD' | 'SPOUSE';
  
  /** Tree context */
  treeId: string;
  
  /** Raw action string (for extensibility) */
  rawAction: string;
}

/**
 * Tree-Level Activity Summary (Read-Only)
 * 
 * Aggregated view for tree-level activity.
 * No pre-grouping: consumers must group if desired.
 */
export interface TreeActivityFeed {
  /** Family tree being viewed */
  treeId: string;
  
  /** All activity entries (chronologically ordered, oldest first) */
  entries: ActivityFeedEntry[];
  
  /** Total number of entries (for pagination) */
  total: number;
  
  /** Pagination metadata */
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Person-Level Change History (Read-Only)
 * 
 * All changes to a single person.
 * No pre-grouping: consumers must filter/group if desired.
 */
export interface PersonChangeHistory {
  /** Family tree context */
  treeId: string;
  
  /** Person being audited */
  personId: string;
  personDisplayName?: string;
  
  /** All changes to this person (chronologically ordered, oldest first) */
  entries: PersonChangeHistoryEntry[];
  
  /** Total number of changes */
  total: number;
  
  /** Pagination metadata */
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Action types for tree-level activity
 * 
 * Comprehensive enumeration of all possible audit actions.
 * Maps backend audit actions to UI-friendly categories.
 */
export enum AuditActionType {
  // Person mutations
  PERSON_CREATED = 'PERSON_CREATED',
  PERSON_UPDATED = 'PERSON_UPDATED',
  PERSON_DELETED = 'PERSON_DELETED',
  
  // Relationship mutations
  PARENT_CHILD_CREATED = 'PARENT_CHILD_CREATED',
  PARENT_CHILD_DELETED = 'PARENT_CHILD_DELETED',
  SPOUSE_RELATIONSHIP_CREATED = 'SPOUSE_RELATIONSHIP_CREATED',
  SPOUSE_RELATIONSHIP_DELETED = 'SPOUSE_RELATIONSHIP_DELETED',
  
  // Tree mutations
  TREE_CREATED = 'TREE_CREATED',
  TREE_UPDATED = 'TREE_UPDATED',
  TREE_DELETED = 'TREE_DELETED',
  
  // Tree sharing/access
  TREE_SHARED = 'TREE_SHARED',
  TREE_UNSHARED = 'TREE_UNSHARED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  
  // Import/export
  DATA_IMPORTED = 'DATA_IMPORTED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  
  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Change types specific to persons
 * 
 * Granular categorization of what changed about a person.
 */
export enum PersonChangeType {
  // Profile changes
  NAME_CHANGED = 'NAME_CHANGED',
  GENDER_CHANGED = 'GENDER_CHANGED',
  BIRTH_DATE_CHANGED = 'BIRTH_DATE_CHANGED',
  BIRTH_PLACE_CHANGED = 'BIRTH_PLACE_CHANGED',
  DEATH_DATE_CHANGED = 'DEATH_DATE_CHANGED',
  DESCRIPTION_CHANGED = 'DESCRIPTION_CHANGED',
  
  // Relationship changes
  PARENT_ADDED = 'PARENT_ADDED',
  PARENT_REMOVED = 'PARENT_REMOVED',
  CHILD_ADDED = 'CHILD_ADDED',
  CHILD_REMOVED = 'CHILD_REMOVED',
  SPOUSE_ADDED = 'SPOUSE_ADDED',
  SPOUSE_REMOVED = 'SPOUSE_REMOVED',
  
  // Lifecycle
  CREATED = 'CREATED',
  DELETED = 'DELETED',
  
  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Mapping from backend action strings to AuditActionType
 * 
 * @internal
 * Used to normalize backend audit action strings to UI categories.
 */
export const ACTION_TYPE_MAPPING: Record<string, AuditActionType> = {
  'create-person': AuditActionType.PERSON_CREATED,
  'update-person': AuditActionType.PERSON_UPDATED,
  'delete-person': AuditActionType.PERSON_DELETED,
  'establish-parent-child': AuditActionType.PARENT_CHILD_CREATED,
  'remove-parent-child': AuditActionType.PARENT_CHILD_DELETED,
  'establish-spouse': AuditActionType.SPOUSE_RELATIONSHIP_CREATED,
  'remove-spouse': AuditActionType.SPOUSE_RELATIONSHIP_DELETED,
  'create-tree': AuditActionType.TREE_CREATED,
  'update-tree': AuditActionType.TREE_UPDATED,
  'delete-tree': AuditActionType.TREE_DELETED,
  'share-tree': AuditActionType.TREE_SHARED,
  'unshare-tree': AuditActionType.TREE_UNSHARED,
  'import-data': AuditActionType.DATA_IMPORTED,
  'export-data': AuditActionType.DATA_EXPORTED,
};

/**
 * Action type to human-readable label
 * 
 * @internal
 * Used in UI to display action descriptions.
 */
export const ACTION_LABELS: Record<AuditActionType, string> = {
  [AuditActionType.PERSON_CREATED]: 'Person created',
  [AuditActionType.PERSON_UPDATED]: 'Person updated',
  [AuditActionType.PERSON_DELETED]: 'Person deleted',
  [AuditActionType.PARENT_CHILD_CREATED]: 'Parent-child relationship added',
  [AuditActionType.PARENT_CHILD_DELETED]: 'Parent-child relationship removed',
  [AuditActionType.SPOUSE_RELATIONSHIP_CREATED]: 'Spouse relationship added',
  [AuditActionType.SPOUSE_RELATIONSHIP_DELETED]: 'Spouse relationship removed',
  [AuditActionType.TREE_CREATED]: 'Tree created',
  [AuditActionType.TREE_UPDATED]: 'Tree updated',
  [AuditActionType.TREE_DELETED]: 'Tree deleted',
  [AuditActionType.TREE_SHARED]: 'Tree shared',
  [AuditActionType.TREE_UNSHARED]: 'Tree sharing removed',
  [AuditActionType.PERMISSION_CHANGED]: 'Permissions changed',
  [AuditActionType.DATA_IMPORTED]: 'Data imported',
  [AuditActionType.DATA_EXPORTED]: 'Data exported',
  [AuditActionType.UNKNOWN]: 'Unknown action',
};

/**
 * Person change type to human-readable label
 * 
 * @internal
 * Used in person history views.
 */
export const PERSON_CHANGE_LABELS: Record<PersonChangeType, string> = {
  [PersonChangeType.NAME_CHANGED]: 'Name changed',
  [PersonChangeType.GENDER_CHANGED]: 'Gender changed',
  [PersonChangeType.BIRTH_DATE_CHANGED]: 'Birth date changed',
  [PersonChangeType.BIRTH_PLACE_CHANGED]: 'Birth place changed',
  [PersonChangeType.DEATH_DATE_CHANGED]: 'Death date changed',
  [PersonChangeType.DESCRIPTION_CHANGED]: 'Description changed',
  [PersonChangeType.PARENT_ADDED]: 'Parent added',
  [PersonChangeType.PARENT_REMOVED]: 'Parent removed',
  [PersonChangeType.CHILD_ADDED]: 'Child added',
  [PersonChangeType.CHILD_REMOVED]: 'Child removed',
  [PersonChangeType.SPOUSE_ADDED]: 'Spouse added',
  [PersonChangeType.SPOUSE_REMOVED]: 'Spouse removed',
  [PersonChangeType.CREATED]: 'Person created',
  [PersonChangeType.DELETED]: 'Person deleted',
  [PersonChangeType.UNKNOWN]: 'Unknown change',
};

/**
 * GUARANTEES vs NON-GUARANTEES
 * 
 * GUARANTEED:
 * ✅ Entries are in chronological order (oldest first)
 * ✅ Each entry has actor, timestamp, actionType
 * ✅ Entity references are present (may be orphaned)
 * ✅ Timestamps are ISO 8601 formatted
 * ✅ No field-level deltas or before/after values
 * 
 * NOT GUARANTEED:
 * ❌ Completeness: entries may be missing if logs are truncated/archived
 * ❌ Entity existence: referenced entities may have been deleted
 * ❌ User existence: actor (userId/username) may be orphaned
 * ❌ Causality: concurrent edits are independent (no dependency detection)
 * ❌ Merge conflict detection: simultaneous changes not flagged
 * ❌ Data reconstruction: cannot derive previous values from entries
 * ❌ Consistency: audit logs are append-only, not transactional
 * ❌ Ordering: within same millisecond, order may be arbitrary
 * 
 * USAGE RESTRICTIONS:
 * 🔒 Read-only: No mutations or modifications to genealogical data
 * 🔒 Informational: For transparency, not for data recovery
 * 🔒 Historical: Entries are immutable once created
 */
