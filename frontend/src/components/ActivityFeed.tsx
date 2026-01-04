import React, { useState, useCallback } from 'react';
import { ActivityEntry } from '../types/collaboration';

interface ActivityFeedProps {
  activities: ActivityEntry[];
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
}

const getActivityIcon = (type: ActivityEntry['type']): string => {
  switch (type) {
    case 'add-person':
      return '👤';
    case 'edit-person':
      return '✏️';
    case 'delete-person':
      return '🗑️';
    case 'add-relationship':
      return '💑';
    case 'delete-relationship':
      return '💔';
    case 'login':
      return '🔓';
    case 'logout':
      return '🔒';
    default:
      return '📝';
  }
};

const getActivityColor = (type: ActivityEntry['type']): string => {
  switch (type) {
    case 'add-person':
      return '#28a745';
    case 'edit-person':
      return '#007bff';
    case 'delete-person':
      return '#dc3545';
    case 'add-relationship':
      return '#ffc107';
    case 'delete-relationship':
      return '#fd7e14';
    case 'login':
      return '#6f42c1';
    case 'logout':
      return '#999999';
    default:
      return '#555555';
  }
};

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    return 'just now';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleLoadMore = useCallback(async () => {
    if (onLoadMore) {
      await onLoadMore();
    }
  }, [onLoadMore]);

  if (activities.length === 0) {
    return (
      <div className="card h-100">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">📋 Activity Feed</h5>
          <button
            className="btn btn-link p-0 text-muted"
            onClick={() => setExpanded(!expanded)}
            style={{ fontSize: '14px' }}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>
        {expanded && (
          <div className="card-body text-center text-muted">
            <p className="mb-0 small">No activities yet</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card h-100 d-flex flex-column">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h5 className="mb-0">📋 Activity Feed</h5>
        <button
          className="btn btn-link p-0 text-muted"
          onClick={() => setExpanded(!expanded)}
          style={{ fontSize: '14px' }}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <>
          <div
            className="flex-grow-1 overflow-auto"
            style={{ minHeight: '200px', maxHeight: '400px' }}
          >
            <div className="list-group list-group-flush">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="list-group-item px-3 py-2 border-0 border-bottom"
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftStyle: 'solid',
                    borderLeftColor: getActivityColor(activity.type),
                    backgroundColor:
                      activity.type === 'delete-person' ||
                      activity.type === 'delete-relationship'
                        ? '#fff5f5'
                        : 'transparent',
                  }}
                >
                  <div className="d-flex align-items-start gap-2">
                    <span style={{ fontSize: '16px', minWidth: '20px' }}>
                      {getActivityIcon(activity.type)}
                    </span>
                    <div className="flex-grow-1 min-width-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong className="small" style={{ fontSize: '12px' }}>
                            {activity.username}
                          </strong>
                          <p className="mb-1 small" style={{ fontSize: '11px' }}>
                            {activity.description}
                          </p>
                          {activity.personName && (
                            <p
                              className="mb-0 small text-muted"
                              style={{
                                fontSize: '10px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              📝 {activity.personName}
                            </p>
                          )}
                        </div>
                        <span
                          className="text-muted"
                          style={{ fontSize: '10px', whiteSpace: 'nowrap', marginLeft: '8px' }}
                        >
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hasMore && (
            <div className="card-footer bg-light text-center">
              <button
                className="btn btn-link btn-sm"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load more activities'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Compact activity feed for sidebar
 */
export const CompactActivityFeed: React.FC<{ activities: ActivityEntry[] }> = ({ activities }) => {
  const recentActivities = activities.slice(0, 5);

  if (recentActivities.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <h6 className="mb-2 text-muted">📋 Recent Activity</h6>
      <div className="list-group list-group-sm">
        {recentActivities.map((activity) => (
          <div
            key={activity.id}
            className="list-group-item px-2 py-1 border-0 small"
            style={{
              fontSize: '11px',
              borderLeftWidth: '2px',
              borderLeftStyle: 'solid',
              borderLeftColor: getActivityColor(activity.type),
            }}
          >
            <div className="d-flex justify-content-between">
              <span>
                <strong>{activity.username}</strong> {activity.type.replace('-', ' ')}
              </span>
              <span className="text-muted">{formatTime(activity.timestamp)}</span>
            </div>
            {activity.personName && (
              <div className="text-muted" style={{ fontSize: '10px' }}>
                {activity.personName}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
