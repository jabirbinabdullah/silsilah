/**
 * Audit View Model Transformer
 * 
 * Converts backend audit log entries to UI-ready view models.
 * Pure transformation layer: no side effects, no filtering, no enrichment.
 * 
 * RESPONSIBILITIES:
 * ✓ Map AuditLogEntryDTO → ActivityFeedEntry
 * ✓ Map AuditLogEntryDTO → PersonChangeHistoryEntry
 * ✓ Classify actions into AuditActionType enum
 * ✓ Generate human-readable labels
 * ✓ Preserve chronological order
 * 
 * NON-RESPONSIBILITIES:
 * ✗ Enrich with missing data (entity names, deleted status)
 * ✗ Filter or group entries
 * ✗ Analyze causality or merge conflicts
 * ✗ Reconstruct before/after values
 * ✗ Orphan detection (pass through as-is)
 * 
 * @module auditTransformer
 */

import {
  AuditLogEntryDTO,
  AuditEntityRef,
  ActivityFeedEntry,
  PersonChangeHistoryEntry,
  AuditActionType,
  PersonChangeType,
  ACTION_TYPE_MAPPING,
  ACTION_LABELS,
  PERSON_CHANGE_LABELS,
} from '../models/auditModels';

/**
 * Parse action string to extract entity type and change type
 * 
 * @internal
 * Heuristic parser for backend action strings.
 * Format: "verb-noun" or "verb-noun-context"
 * 
 * EXAMPLES:
 * - "create-person" → { entityType: 'PERSON', changeType: 'CREATED' }
 * - "update-person" → { entityType: 'PERSON', changeType: 'UNKNOWN' }
 * - "establish-parent-child" → { entityType: 'RELATIONSHIP', changeType: 'PARENT_ADDED' }
 * - "delete-person" → { entityType: 'PERSON', changeType: 'DELETED' }
 * 
 * @returns Parsed components or null if unrecognizable
 */
function parseAction(actionString: string): {
  entityType: 'TREE' | 'PERSON' | 'RELATIONSHIP' | 'UNKNOWN';
  changeType: PersonChangeType;
} | null {
  const lower = actionString.toLowerCase().trim();
  
  // Tree-level actions
  if (lower.includes('tree')) {
    if (lower.includes('create')) {
      return { entityType: 'TREE', changeType: PersonChangeType.CREATED };
    }
    if (lower.includes('delete')) {
      return { entityType: 'TREE', changeType: PersonChangeType.DELETED };
    }
    return { entityType: 'TREE', changeType: PersonChangeType.UNKNOWN };
  }
  
  // Person-level actions
  if (lower.includes('person')) {
    if (lower.includes('create')) {
      return { entityType: 'PERSON', changeType: PersonChangeType.CREATED };
    }
    if (lower.includes('delete')) {
      return { entityType: 'PERSON', changeType: PersonChangeType.DELETED };
    }
    if (lower.includes('update')) {
      return { entityType: 'PERSON', changeType: PersonChangeType.UNKNOWN };
    }
    return { entityType: 'PERSON', changeType: PersonChangeType.UNKNOWN };
  }
  
  // Relationship actions
  if (lower.includes('parent') || lower.includes('child')) {
    if (lower.includes('establish') || lower.includes('add')) {
      if (lower.includes('parent')) {
        return { entityType: 'RELATIONSHIP', changeType: PersonChangeType.PARENT_ADDED };
      }
      if (lower.includes('child')) {
        return { entityType: 'RELATIONSHIP', changeType: PersonChangeType.CHILD_ADDED };
      }
    }
    if (lower.includes('remove') || lower.includes('delete')) {
      if (lower.includes('parent')) {
        return { entityType: 'RELATIONSHIP', changeType: PersonChangeType.PARENT_REMOVED };
      }
      if (lower.includes('child')) {
        return { entityType: 'RELATIONSHIP', changeType: PersonChangeType.CHILD_REMOVED };
      }
    }
    return { entityType: 'RELATIONSHIP', changeType: PersonChangeType.UNKNOWN };
  }
  
  if (lower.includes('spouse')) {
    if (lower.includes('establish') || lower.includes('add')) {
      return { entityType: 'RELATIONSHIP', changeType: PersonChangeType.SPOUSE_ADDED };
    }
    if (lower.includes('remove') || lower.includes('delete')) {
      return { entityType: 'RELATIONSHIP', changeType: PersonChangeType.SPOUSE_REMOVED };
    }
    return { entityType: 'RELATIONSHIP', changeType: PersonChangeType.UNKNOWN };
  }
  
  return null;
}

/**
 * Convert backend audit log entry to activity feed entry
 * 
 * GUARANTEES:
 * ✅ All required fields present
 * ✅ Chronological order preserved
 * ✅ No field inference or enrichment
 * ✅ Entity references passed through as-is
 * 
 * @param entry Backend audit log entry
 * @returns UI-ready activity feed entry
 */
export function transformToActivityFeedEntry(entry: AuditLogEntryDTO): ActivityFeedEntry {
  // Classify action into enum
  const actionType = (ACTION_TYPE_MAPPING[entry.action] || AuditActionType.UNKNOWN) as AuditActionType;
  
  // Default entity ref (may be enriched by consumer)
  const entity: AuditEntityRef = {
    type: 'UNKNOWN',
    id: '', // Will be populated by consumer if available
  };
  
  // Attempt to extract entity from action string
  const parsed = parseAction(entry.action);
  if (parsed) {
    entity.type = parsed.entityType;
  }
  
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    actor: entry.actor,
    actionType,
    actionLabel: ACTION_LABELS[actionType] || 'Unknown action',
    entity,
    relatedEntity: undefined, // Consumer must populate if needed
    treeId: entry.treeId,
    rawAction: entry.action,
  };
}

/**
 * Convert backend audit log entry to person change history entry
 * 
 * GUARANTEES:
 * ✅ All required fields present
 * ✅ Chronological order preserved
 * ✅ Change type extracted from action
 * ✅ Person reference passed through as-is
 * 
 * @param entry Backend audit log entry
 * @returns UI-ready person change history entry
 */
export function transformToPersonChangeHistoryEntry(
  entry: AuditLogEntryDTO
): PersonChangeHistoryEntry {
  // Parse action to determine change type
  const parsed = parseAction(entry.action);
  const changeType = (parsed?.changeType || PersonChangeType.UNKNOWN) as PersonChangeType;
  
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    actor: entry.actor,
    changeType,
    changeLabel: PERSON_CHANGE_LABELS[changeType] || 'Unknown change',
    personId: '', // Consumer must populate
    personDisplayName: undefined, // Consumer must enrich
    relatedPersonId: undefined, // Consumer must populate
    relatedPersonDisplayName: undefined, // Consumer must enrich
    relatedRole: undefined, // Consumer must infer
    treeId: entry.treeId,
    rawAction: entry.action,
  };
}

/**
 * Batch transformer for activity feed
 * 
 * @param entries Raw backend entries
 * @returns Transformed, chronologically ordered entries
 */
export function transformActivityFeed(
  entries: AuditLogEntryDTO[]
): ActivityFeedEntry[] {
  // Preserve order (assume input is already ordered)
  // Consumer responsible for sorting if needed
  return entries.map(transformToActivityFeedEntry);
}

/**
 * Batch transformer for person change history
 * 
 * @param entries Raw backend entries
 * @returns Transformed, chronologically ordered entries
 */
export function transformPersonChangeHistory(
  entries: AuditLogEntryDTO[]
): PersonChangeHistoryEntry[] {
  // Preserve order (assume input is already ordered)
  // Consumer responsible for sorting if needed
  return entries.map(transformToPersonChangeHistoryEntry);
}

/**
 * TRANSFORMATION GUARANTEES
 * 
 * ✅ GUARANTEED:
 * - All fields from input are copied to output
 * - Chronological order is preserved
 * - No data loss or modification
 * - No enrichment or inference
 * - No external API calls
 * - Pure transformation (idempotent)
 * 
 * ❌ NOT GUARANTEED:
 * - Entity names populated (consumer must enrich)
 * - Related entities populated (consumer must link)
 * - Orphan status detected (consumer must check)
 * - User details enriched (consumer must resolve)
 * - Actionability (entries may reference deleted entities)
 * - Semantic correctness (parser is heuristic-based)
 * 
 * EXTENSION POINTS:
 * - Consumer can enrich with additional data lookups
 * - Consumer can filter/group after transformation
 * - Consumer can sort if chronological order uncertain
 */
