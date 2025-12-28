/**
 * Get Tree Activity Query Handler
 * 
 * Retrieves paginated audit log entries for a family tree.
 * Read-only operation. Authorization enforced at controller level.
 * 
 * @module getTreeActivityQuery
 */

import type { AuditLogRepository, AuditLogEntry } from '../../infrastructure/repositories/audit-log.repository';
import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

/**
 * Query: Fetch tree activity log with pagination
 */
export interface GetTreeActivityQuery {
  treeId: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated activity result
 */
export interface ActivityPageResult {
  treeId: string;
  entries: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Get Tree Activity Query Handler
 * 
 * RESPONSIBILITIES:
 * ✓ Fetch activity log entries for tree
 * ✓ Apply pagination (limit, offset)
 * ✓ Return total count
 * ✓ Validate treeId exists
 * 
 * NON-RESPONSIBILITIES:
 * ✗ Perform authorization (done at controller)
 * ✗ Enrich entries with additional data
 * ✗ Filter by action type (consumer applies)
 * ✗ Sort entries (assumed pre-sorted)
 */
export class GetTreeActivityHandler {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly genealogyRepository: GenealogyGraphRepository,
  ) {}

  /**
   * Execute query: fetch paginated activity log
   * 
   * @param query Query with treeId and pagination options
   * @returns Paginated activity entries
   * @throws Error if tree doesn't exist
   */
  async execute(query: GetTreeActivityQuery): Promise<ActivityPageResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    // Validate pagination parameters
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    if (offset < 0) {
      throw new Error('Offset must be >= 0');
    }

    // Verify tree exists
    const tree = await this.genealogyRepository.findById(query.treeId);
    if (!tree) {
      throw new Error(`Tree not found: ${query.treeId}`);
    }

    // Fetch all activity entries for this tree
    // NOTE: Current implementation stores entries in-memory per tree
    // Production implementation would query database with limit/offset
    const allEntries = await this.getActivityEntries(query.treeId);
    const total = allEntries.length;

    // Apply pagination
    const entries = allEntries.slice(offset, offset + limit);

    return {
      treeId: query.treeId,
      entries,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Fetch all activity entries for tree
   * 
   * @internal
   * Currently in-memory. Replace with repository query in production.
   */
  private async getActivityEntries(treeId: string): Promise<AuditLogEntry[]> {
    // TODO: Query from auditLogRepository with index on treeId
    // For now, return empty array (actual audit logging to be added)
    return [];
  }
}
