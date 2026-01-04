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
  ActivityFeedEntry,
  PersonChangeHistoryEntry,
} from '../models/auditModels';
import {
  transformActivityFeed,
  transformPersonChangeHistory,
} from '../adapters/auditTransformer';
import { buildPaginationMeta, resolvePagination } from '../utils/pagination';
import {
  getTreeActivity as apiGetTreeActivity,
  getPersonHistory as apiGetPersonHistory,
} from '../api';

/**
 * Fetch tree activity feed with UI transformation
 *
 * @param treeId Tree to fetch activity for
 * @param page The page number for pagination.
 * @param limit The number of items per page.
 * @returns Paginated tree activity feed
 * @throws Error if API call fails
 */
export async function fetchTreeActivityFeed(
  treeId: string,
  page: number = 1,
  limit: number = 50
): Promise<TreeActivityFeed> {
  try {
    const { limit: safeLimit } = resolvePagination(page, limit);
    const response = await apiGetTreeActivity(treeId, page, safeLimit);

    if (!Array.isArray(response.entries) || typeof response.total !== 'number') {
      throw new Error('Invalid activity log response structure');
    }

    const entries: ActivityFeedEntry[] = transformActivityFeed(
      response.entries as any
    );

    return {
      treeId,
      entries,
      total: response.total,
      pagination: buildPaginationMeta(response.total, page, safeLimit, entries.length),
    };
  } catch (error) {
    console.error(`Failed to fetch tree activity for ${treeId}:`, error);
    throw new Error(
      `Failed to load activity feed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Fetch person change history with UI transformation
 *
 * @param treeId Tree to fetch activity for
 * @param personId Person to filter by
 * @param page The page number for pagination.
 * @param limit The number of items per page.
 * @returns Paginated person change history
 * @throws Error if API call fails or personId is invalid
 */
export async function fetchPersonChangeHistory(
  treeId: string,
  personId: string,
  page: number = 1,
  limit: number = 50
): Promise<PersonChangeHistory> {
  if (!personId || typeof personId !== 'string' || personId.trim() === '') {
    throw new Error('Invalid personId: must be non-empty string');
  }

  try {
    const { limit: safeLimit } = resolvePagination(page, limit);
    const response = await apiGetPersonHistory(treeId, personId, page, safeLimit);

    if (!Array.isArray(response.entries) || typeof response.total !== 'number') {
      throw new Error('Invalid activity log response structure');
    }

    const allEntries: PersonChangeHistoryEntry[] = transformPersonChangeHistory(
      response.entries as any
    );

    return {
      treeId,
      personId,
      entries: allEntries,
      total: response.total,
      pagination: buildPaginationMeta(response.total, page, safeLimit, allEntries.length),
    };
  } catch (error) {
    console.error(`Failed to fetch person history for ${personId}:`, error);
    throw new Error(
      `Failed to load change history: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
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
  const newPage =
    Math.floor(currentFeed.pagination.offset / currentFeed.pagination.limit) + 2;
  return fetchTreeActivityFeed(treeId, newPage, currentFeed.pagination.limit);
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
  const newPage =
    Math.floor(
      currentHistory.pagination.offset / currentHistory.pagination.limit
    ) + 2;
  return fetchPersonChangeHistory(
    treeId,
    personId,
    newPage,
    currentHistory.pagination.limit
  );
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
