import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTreeActivityLog, getPersonChangeHistory } from '../api';
import type { AuditLogEntry, TreeActivityResponse, PersonHistoryResponse } from '../types/audit';
import {
  getActionLabel,
  getActionIcon,
  getActionColor,
} from '../types/audit';

/**
 * TimelineActivity - Chronological activity feed component
 *
 * Features:
 * - Read-only display of tree activity
 * - Chronological ordering (newest first)
 * - Pagination support with "Load more" button
 * - Empty state with helpful message
 * - Loading skeleton state
 * - Clickable actor names (navigate to person if applicable)
 * - Responsive design with Bootstrap styling
 *
 * Constraints:
 * - No filtering logic in component
 * - No mutation support
 * - Reuses existing routing (navigate within app)
 */

interface TimelineActivityProps {
  treeId: string;
  personId?: string; // If provided, shows person-specific history
  limit?: number;
  onPersonLinkClick?: (personId: string) => void;
}

interface ActivityState {
  entries: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Extract person IDs from action string
 * Currently uses heuristic parsing; backend should provide structured metadata
 */
function extractPersonIdsFromAction(action: string): string[] {
  const personIds: string[] = [];

  // Heuristic: looks for UUIDs in action strings
  // Format: "action: person-id-1 related-to person-id-2"
  const uuidPattern = /[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}/gi;
  const matches = action.match(uuidPattern);

  if (matches) {
    personIds.push(...matches);
  }

  return personIds;
}

export const TreeActivityFeed: React.FC<TimelineActivityProps> = ({
  treeId,
  personId,
  limit = 50,
  onPersonLinkClick,
}) => {
  const navigate = useNavigate();
  const [state, setState] = useState<ActivityState>({
    entries: [],
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
    isLoading: true,
    isLoadingMore: false,
    error: null,
  });

  /**
   * Load activity entries from backend
   */
  const loadActivity = useCallback(
    async (offset: number = 0) => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: offset === 0,
          error: null,
        }));

        let response: TreeActivityResponse | PersonHistoryResponse;

        if (personId) {
          // Load person-specific history
          response = (await getPersonChangeHistory(treeId, personId, {
            limit: state.limit,
            offset,
          })) as PersonHistoryResponse;
        } else {
          // Load tree-wide activity
          response = (await getTreeActivityLog(treeId, {
            limit: state.limit,
            offset,
          })) as TreeActivityResponse;
        }

        setState((prev) => ({
          ...prev,
          entries: offset === 0 ? response.entries : [...prev.entries, ...response.entries],
          total: response.total,
          offset,
          hasMore: response.pagination.hasMore,
          isLoading: false,
          isLoadingMore: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load activity';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
          error: message,
        }));
      }
    },
    [treeId, personId, state.limit]
  );

  /**
   * Load initial activity on mount
   */
  useEffect(() => {
    loadActivity(0);
  }, [treeId, personId]); // NOTE: loadActivity dependency excluded to prevent loops

  /**
   * Handle "Load more" button click
   */
  const handleLoadMore = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingMore: true }));
    await loadActivity(state.offset + state.limit);
  }, [state.offset, state.limit, loadActivity]);

  /**
   * Handle clicking on an actor name or person ID
   */
  const handlePersonClick = useCallback(
    (id: string) => {
      if (onPersonLinkClick) {
        onPersonLinkClick(id);
      } else {
        // Navigate to person in current tree
        navigate(`/tree/${treeId}/person/${id}`);
      }
    },
    [treeId, navigate, onPersonLinkClick]
  );

  // Loading skeleton state
  if (state.isLoading && state.entries.length === 0) {
    return (
      <div className="card h-100">
        <div className="card-header bg-light">
          <h6 className="mb-0">⏱️ Activity</h6>
        </div>
        <div className="card-body">
          <div className="placeholder-glow">
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-3">
                <div className="placeholder col-10" style={{ height: '16px' }} />
                <div className="placeholder col-8 mt-2" style={{ height: '14px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error && state.entries.length === 0) {
    return (
      <div className="card h-100">
        <div className="card-header bg-light">
          <h6 className="mb-0">⏱️ Activity</h6>
        </div>
        <div className="card-body">
          <div className="alert alert-danger mb-0 small">
            <p className="mb-1">
              <strong>Failed to load activity</strong>
            </p>
            <p className="mb-0" style={{ fontSize: '12px' }}>
              {state.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (state.entries.length === 0) {
    return (
      <div className="card h-100">
        <div className="card-header bg-light">
          <h6 className="mb-0">⏱️ Activity</h6>
        </div>
        <div className="card-body text-center text-muted">
          <p className="mb-0 small">
            {personId
              ? 'No changes for this person yet'
              : 'No activity in this tree yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-100 d-flex flex-column">
      <div className="card-header bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">⏱️ Activity</h6>
          {state.total > 0 && (
            <small className="text-muted">{state.total} total</small>
          )}
        </div>
      </div>

      <div
        className="flex-grow-1 overflow-auto"
        style={{ minHeight: '200px', maxHeight: '600px' }}
      >
        <div className="list-group list-group-flush">
          {state.entries.map((entry, idx) => {
            const icon = getActionIcon(entry.action);
            const label = getActionLabel(entry.action);
            const color = getActionColor(entry.action);
            const relativeTime = formatRelativeTime(entry.timestamp);
            const personIds = extractPersonIdsFromAction(entry.action);
            const username = entry.actor?.username ?? 'anonymous';
            const role = entry.actor?.role ?? 'UNKNOWN';
            const isSystem = role === 'UNKNOWN' || ['system', 'anonymous'].includes(String(username).toLowerCase());

            return (
              <div
                key={`${entry.id}-${idx}`}
                className="list-group-item px-3 py-2 border-0 border-bottom"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: color,
                  backgroundColor:
                    entry.action.startsWith('REMOVE') || entry.action.includes('DELETE')
                      ? '#fff5f5'
                      : 'transparent',
                }}
              >
                <div className="d-flex align-items-start gap-2">
                  {/* Icon */}
                  <span
                    style={{
                      fontSize: '18px',
                      minWidth: '24px',
                      textAlign: 'center',
                    }}
                  >
                    {icon}
                  </span>

                  {/* Content */}
                  <div className="flex-grow-1 min-width-0">
                    <div className="d-flex justify-content-between align-items-start">
                      <div style={{ flex: '1 1 auto' }}>
                        {/* Actor name (clickable) */}
                        <div className="small mb-1">
                          <strong
                            style={{
                              cursor: 'pointer',
                              color: '#0d6efd',
                              textDecoration: 'none',
                            }}
                            onClick={() =>
                              handlePersonClick(entry.actor.userId)
                            }
                            title={`${entry.actor.username} (${entry.actor.role})`}
                          >
                            {entry.actor.username}
                          </strong>
                          <span className="text-muted mx-1">•</span>
                          <span className="text-muted small" style={{ fontSize: '11px' }}>
                            {entry.actor.role}
                          </span>
                          {isSystem && (
                            <span
                              className="badge bg-secondary ms-2"
                              aria-label="System action"
                              title="System action"
                              style={{ fontSize: '10px' }}
                            >
                              System
                            </span>
                          )}
                        </div>

                        {/* Action label */}
                        <p className="mb-1 small" style={{ fontSize: '12px' }}>
                          {label}
                        </p>

                        {/* Person IDs (if extracted) */}
                        {personIds.length > 0 && (
                          <div className="small text-muted" style={{ fontSize: '11px' }}>
                            {personIds.map((id, i) => (
                              <span key={id}>
                                {i > 0 && ', '}
                                <span
                                  style={{
                                    cursor: 'pointer',
                                    color: '#0d6efd',
                                    textDecoration: 'underline',
                                  }}
                                  onClick={() => handlePersonClick(id)}
                                >
                                  {id.substring(0, 8)}…
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span
                        className="text-muted flex-shrink-0"
                        style={{
                          fontSize: '11px',
                          marginLeft: '8px',
                        }}
                        title={new Date(entry.timestamp).toLocaleString()}
                      >
                        {relativeTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Load more button */}
      {state.hasMore && (
        <div className="card-footer bg-light text-center py-2 border-top">
          <button
            className="btn btn-link btn-sm"
            onClick={handleLoadMore}
            disabled={state.isLoadingMore}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
            }}
          >
            {state.isLoadingMore ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                  style={{ width: '14px', height: '14px' }}
                />
                Loading...
              </>
            ) : (
              `Load more (${state.offset + state.limit}/${state.total})`
            )}
          </button>
        </div>
      )}

      {/* Error state (with existing entries) */}
      {state.error && state.entries.length > 0 && (
        <div className="card-footer bg-light border-top">
          <div className="alert alert-warning mb-0 small py-2">
            {state.error}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeActivityFeed;
