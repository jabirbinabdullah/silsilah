/**
 * Get Person History Query Handler
 * 
 * Retrieves paginated audit log entries for changes to a specific person.
 * Filters tree activity to entries relevant to the person.
 * Read-only operation. Authorization enforced at controller level.
 * 
 * @module getPersonHistoryQuery
 */

import type { AuditLogEntry, AuditLogRepository } from '../../infrastructure/repositories/audit-log.repository';
import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

/**
 * Query: Fetch person change history with pagination
 */
export interface GetPersonHistoryQuery {
  treeId: string;
  personId: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated person history result
 */
export interface PersonHistoryPageResult {
  treeId: string;
  personId: string;
  entries: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Get Person History Query Handler
 * 
 * RESPONSIBILITIES:
 * ✓ Fetch activity log entries for person
 * ✓ Filter to entries relevant to person
 * ✓ Apply pagination (limit, offset)
 * ✓ Return total count
 * ✓ Validate treeId and personId exist
 * 
 * NON-RESPONSIBILITIES:
 * ✗ Perform authorization (done at controller)
 * ✗ Enrich entries with person names
 * ✗ Reconstruct before/after values
 * ✗ Infer causality
 * 
 * CONSTRAINTS:
 * - Filtering is heuristic-based (checks if action mentions person ID)
 * - Production implementation would use action metadata
 */
export class GetPersonHistoryHandler {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly genealogyRepository: GenealogyGraphRepository,
  ) {}

  /**
   * Execute query: fetch paginated person change history
   * 
   * @param query Query with treeId, personId, and pagination options
   * @returns Paginated history entries
   * @throws Error if tree or person doesn't exist
   */
  async execute(query: GetPersonHistoryQuery): Promise<PersonHistoryPageResult> {
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

    // Verify person exists in tree
    const person = tree.getPerson(query.personId);
    if (!person) {
      throw new Error(`Person not found: ${query.personId}`);
    }

    const page = await this.auditLogRepository.findByPerson(query.treeId, query.personId, limit, offset);
    const entries = page.entries;
    const total = page.total;

    return {
      treeId: query.treeId,
      personId: query.personId,
      entries,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

}
