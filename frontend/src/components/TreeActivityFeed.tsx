import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchTreeActivityFeed,
  fetchPersonChangeHistory,
} from '../services/auditService';
import type {
  ActivityFeedEntry,
  TreeActivityFeed as TreeActivityFeedModel,
  PersonChangeHistory,
} from '../models/auditModels';
import { getActionIcon, getActionColor } from '../types/audit';

interface TimelineActivityProps {
  treeId: string;
  personId?: string;
  limit?: number;
  onPersonLinkClick?: (personId: string) => void;
}

interface ActivityState {
  feed: TreeActivityFeedModel | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export const TreeActivityFeed: React.FC<TimelineActivityProps> = ({
  treeId,
  personId,
  limit = 20,
  onPersonLinkClick,
}) => {
  const navigate = useNavigate();
  const [state, setState] = useState<ActivityState>({
    feed: null,
    isLoading: true,
    isLoadingMore: false,
    error: null,
  });

  const loadActivity = useCallback(
    async (page: number = 1) => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: page === 1,
          isLoadingMore: page > 1,
          error: null,
        }));

        const response = personId
          ? await fetchPersonChangeHistory(treeId, personId, page, limit)
          : await fetchTreeActivityFeed(treeId, page, limit);

        setState((prev) => {
          const mergedFeed: TreeActivityFeedModel | PersonChangeHistory = page > 1 && prev.feed
            ? {
                ...response,
                entries: [...prev.feed.entries, ...response.entries],
              } as any
            : response;
          return {
            ...prev,
            feed: mergedFeed as TreeActivityFeedModel,
            isLoading: false,
            isLoadingMore: false,
          };
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load activity';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
          error: message,
        }));
      }
    },
    [treeId, personId, limit]
  );

  useEffect(() => {
    loadActivity(1);
  }, [loadActivity]);

  const handleLoadMore = useCallback(async () => {
    if (!state.feed || !state.feed.pagination.hasMore) return;
    const currentPage = Math.floor(
      state.feed.pagination.offset / state.feed.pagination.limit
    );
    await loadActivity(currentPage + 2);
  }, [state.feed, loadActivity]);

  const handlePersonClick = useCallback(
    (id: string) => {
      if (onPersonLinkClick) {
        onPersonLinkClick(id);
      } else {
        navigate(`/tree/${treeId}/person/${id}`);
      }
    },
    [treeId, navigate, onPersonLinkClick]
  );

  if (state.isLoading && !state.feed) {
    return (
      <div className="card h-100">
        <div className="card-header bg-light">
          <h6 className="mb-0">⏱️ Activity</h6>
        </div>
        <div className="card-body">
          <div className="placeholder-glow">
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-3">
                <div
                  className="placeholder col-10"
                  style={{ height: '16px' }}
                />
                <div
                  className="placeholder col-8 mt-2"
                  style={{ height: '14px' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state.error && !state.feed) {
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

  if (!state.feed || state.feed.entries.length === 0) {
    return (
      <div className="card h-100">
        <div className="card-header bg-light">
          <h6 className="mb-0">⏱️ Activity</h6>
        </div>
        <div className="card-body text-center text-muted">
          <p className="mb-0 small">
            {personId
              ? 'No changes for this person yet.'
              : 'No activity in this tree yet.'}
          </p>
        </div>
      </div>
    );
  }

  const { entries, total, pagination } = state.feed;

  return (
    <div className="card h-100 d-flex flex-column">
      <div className="card-header bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">⏱️ Activity</h6>
          {total > 0 && <small className="text-muted">{total} total</small>}
        </div>
      </div>

      <div
        className="flex-grow-1 overflow-auto"
        style={{ minHeight: '200px', maxHeight: '600px' }}
      >
        <div className="list-group list-group-flush">
          {entries.map((entry: ActivityFeedEntry) => {
            const icon = getActionIcon(entry.rawAction);
            const color = getActionColor(entry.rawAction);
            const relativeTime = formatRelativeTime(entry.timestamp);

            return (
              <div
                key={entry.id}
                className="list-group-item px-3 py-2 border-0 border-bottom"
                style={{
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <div className="d-flex align-items-start gap-2">
                  <span
                    style={{
                      fontSize: '18px',
                      minWidth: '24px',
                      textAlign: 'center',
                    }}
                  >
                    {icon}
                  </span>
                  <div className="flex-grow-1 min-width-0">
                    <div className="small mb-1">
                      <strong
                        className="text-primary"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handlePersonClick(entry.actor.userId)}
                        title={`${entry.actor.username} (${entry.actor.role})`}
                      >
                        {entry.actor.username}
                      </strong>
                    </div>
                    <p className="mb-1 small">{entry.actionLabel}</p>
                  </div>
                  <span
                    className="text-muted flex-shrink-0"
                    style={{ fontSize: '11px' }}
                    title={new Date(entry.timestamp).toLocaleString()}
                  >
                    {relativeTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pagination.hasMore && (
        <div className="card-footer bg-light text-center py-2 border-top">
          <button
            className="btn btn-link btn-sm"
            onClick={handleLoadMore}
            disabled={state.isLoadingMore}
          >
            {state.isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TreeActivityFeed;
