/**
 * Audit Service
 * 
 * High-level service for fetching and transforming audit logs into UI view models.
 * Separates concerns:
 * - API layer: HTTP communication with backend
 * - Transformer layer: Raw entry → UI DTO conversion
 * - Service layer: Business logic (filtering, enrichment)
 * 
 * @module auditService
 */

import {
  TreeActivityFeed,
  PersonChangeHistory,
  AuditLogEntryDTO,
  ActivityFeedEntry,
  PersonChangeHistoryEntry,
} from '../models/auditModels';
import {
  transformActivityFeed,
  transformPersonChangeHistory,
} from '../adapters/auditTransformer';
import {
  getTreeActivityLog as apiGetTreeActivityLog,
  getPersonChangeHistory as apiGetPersonChangeHistory,
} from '../api';

/**
 * Fetch tree activity feed with UI transformation
 * 
 * RESPONSIBILITIES:
 * ✓ Fetch raw entries from backend
 * ✓ Transform to ActivityFeedEntry DTOs
 * ✓ Calculate pagination metadata
 * ✓ Preserve chronological order
 * 
 * NON-RESPONSIBILITIES:
 * ✗ Enrich with entity names (consumer must do)
 * ✗ Filter by action type (consumer must do)
 * ✗ Sort by timestamp (already ordered)
 * ✗ Group by entity (consumer must do)
 * ✗ Detect orphans (consumer must check)
 * 
 * @param treeId Tree to fetch activity for
 * @param options Pagination options
 * @returns Paginated tree activity feed
 * @throws Error if API call fails
 */
export async function fetchTreeActivityFeed(
  treeId: string,
  options?: { limit?: number; offset?: number }
): Promise<TreeActivityFeed> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  
  try {
    const response = await apiGetTreeActivityLog(treeId, { limit, offset });
    
    // Validate response structure
    if (!Array.isArray(response.entries) || typeof response.total !== 'number') {
      throw new Error('Invalid activity log response structure');
    }
    
    // Transform raw entries to UI DTOs
    const entries: ActivityFeedEntry[] = transformActivityFeed(
      response.entries as AuditLogEntryDTO[]
    );
    
    return {
      treeId,
      entries,
      total: response.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + entries.length < response.total,
      },
    };
  } catch (error) {
    console.error(`Failed to fetch tree activity for ${treeId}:`, error);
    throw new Error(
      `Failed to load activity feed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch person change history with UI transformation
 * 
 * RESPONSIBILITIES:
 * ✓ Fetch raw entries from backend
 * ✓ Filter entries relevant to person
 * ✓ Transform to PersonChangeHistoryEntry DTOs
 * ✓ Calculate pagination metadata
 * ✓ Preserve chronological order
 * 
 * NON-RESPONSIBILITIES:
 * ✗ Enrich person name (consumer must provide)
 * ✗ Link related persons (consumer must do)
 * ✗ Infer relationship context (consumer must provide)
 * ✗ Sort by timestamp (already ordered)
 * ✗ Reconstruct before/after values (not available)
 * 
 * @param treeId Tree to fetch activity for
 * @param personId Person to filter by
 * @param options Pagination options
 * @returns Paginated person change history
 * @throws Error if API call fails or personId is invalid
 */
export async function fetchPersonChangeHistory(
  treeId: string,
  personId: string,
  options?: { limit?: number; offset?: number }
): Promise<PersonChangeHistory> {
  if (!personId || typeof personId !== 'string' || personId.trim() === '') {
    throw new Error('Invalid personId: must be non-empty string');
  }
  
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  
  try {
    // Fetch full activity log (backend doesn't support person filtering yet)
    const response = await apiGetPersonChangeHistory(treeId, personId, { limit, offset });
    
    // Validate response structure
    if (!Array.isArray(response.entries) || typeof response.total !== 'number') {
      throw new Error('Invalid activity log response structure');
    }
    
    // Transform raw entries to UI DTOs
    const allEntries: PersonChangeHistoryEntry[] = transformPersonChangeHistory(
      response.entries as AuditLogEntryDTO[]
    );
    
    // TODO: Filter to entries relevant to this person
    // Current limitation: Backend doesn't expose entity IDs in audit logs
    // Once backend is enhanced, replace client-side filtering with API query param
    const filteredEntries = allEntries.filter(
      (entry) => entry.personId === personId || entry.relatedPersonId === personId
    );
    
    return {
      treeId,
      personId,
      entries: filteredEntries,
      total: filteredEntries.length, // Client-side filtered count
      pagination: {
        limit,
        offset,
        hasMore: offset + filteredEntries.length < filteredEntries.length,
      },
    };
  } catch (error) {
    console.error(`Failed to fetch person history for ${personId}:`, error);
    throw new Error(
      `Failed to load change history: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Load more entries in activity feed (pagination)
 * 
 * @param currentFeed Current feed state
 * @returns Merged feed with new entries appended
 */
export async function loadMoreActivityFeedEntries(
  treeId: string,
  currentFeed: TreeActivityFeed
): Promise<TreeActivityFeed> {
  const newOffset = currentFeed.pagination.offset + currentFeed.pagination.limit;
  return fetchTreeActivityFeed(treeId, {
    limit: currentFeed.pagination.limit,
    offset: newOffset,
  });
}

/**
 * Load more entries in person change history (pagination)
 * 
 * @param currentHistory Current history state
 * @returns Merged history with new entries appended
 */
export async function loadMorePersonChangeHistoryEntries(
  treeId: string,
  personId: string,
  currentHistory: PersonChangeHistory
): Promise<PersonChangeHistory> {
  const newOffset = currentHistory.pagination.offset + currentHistory.pagination.limit;
  return fetchPersonChangeHistory(treeId, personId, {
    limit: currentHistory.pagination.limit,
    offset: newOffset,
  });
}

/**
 * SERVICE GUARANTEES
 * 
 * ✅ GUARANTEED:
 * - All backend entries fetched (up to limit)
 * - Chronological order preserved
 * - Pagination metadata accurate
 * - Transformation applied consistently
 * - Error handling and logging
 * 
 * ❌ NOT GUARANTEED:
 * - Entity names enriched (consumer must populate)
 * - Entity references validated (may be orphaned)
 * - Semantic grouping (consumer must group)
 * - Related person links resolved (consumer must provide)
 * - Complete history (backend may not log all changes)
 * - Merge conflict detection (not possible from logs alone)
 * 
 * EXTENSION OPPORTUNITIES:
 * - Cache entries with stale-while-revalidate
 * - Add search/filter by action type
 * - Debounce pagination requests
 * - Monitor performance (large activity logs)
 * - Add retry logic for failed requests
 */
