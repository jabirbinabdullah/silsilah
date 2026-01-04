import React, { useState } from 'react';
import { UserPresence } from '../types/collaboration';

interface PresenceIndicatorsProps {
  activeUsers: UserPresence[];
  currentUserId: string;
  maxVisible?: number;
}

export const PresenceIndicators: React.FC<PresenceIndicatorsProps> = ({
  activeUsers,
  currentUserId,
  maxVisible = 3,
}) => {
  const [showAll, setShowAll] = useState(false);
  
  const otherUsers = activeUsers.filter(u => u.userId !== currentUserId);
  const visibleUsers = showAll ? otherUsers : otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="d-flex align-items-center gap-2" title="Active users in this tree">
      <span className="text-muted small fw-bold">Active:</span>
      <div className="d-flex align-items-center gap-1" style={{ flexWrap: 'wrap' }}>
        {visibleUsers.map((user) => (
          <div
            key={user.userId}
            className="d-flex align-items-center gap-1"
            title={`${user.username} (${user.status}${user.currentPersonId ? ` - viewing ${user.currentPersonId}` : ''})`}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Colored dot indicator */}
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: user.color,
                opacity: user.status === 'idle' ? 0.5 : 1,
                border: '2px solid white',
                boxShadow: `0 0 4px ${user.color}`,
              }}
            />
            {/* Username */}
            <span
              className="text-muted small"
              style={{
                fontSize: '11px',
                maxWidth: '80px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.username}
            </span>
            {/* Status badge */}
            {user.status === 'editing' && (
              <span
                className="badge bg-warning text-dark"
                style={{
                  fontSize: '9px',
                  padding: '2px 4px',
                }}
              >
                ✏
              </span>
            )}
          </div>
        ))}
        
        {!showAll && hiddenCount > 0 && (
          <button
            className="btn btn-link btn-sm p-0"
            style={{ fontSize: '11px' }}
            onClick={() => setShowAll(true)}
            title={`${hiddenCount} more user${hiddenCount > 1 ? 's' : ''}`}
          >
            +{hiddenCount}
          </button>
        )}
        
        {showAll && hiddenCount > 0 && (
          <button
            className="btn btn-link btn-sm p-0"
            style={{ fontSize: '11px' }}
            onClick={() => setShowAll(false)}
            title="Collapse"
          >
            ↑
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Presence indicator bar to show in toolbar
 */
export const PresenceBar: React.FC<PresenceIndicatorsProps> = ({
  activeUsers,
  currentUserId,
  maxVisible = 4,
}) => {
  const otherUsers = activeUsers.filter(u => u.userId !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div
      className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-light"
      style={{ minHeight: '44px' }}
    >
      <span className="text-muted fw-bold small">👥 Active Viewers/Editors:</span>
      <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
        {otherUsers.slice(0, maxVisible).map((user) => (
          <div
            key={user.userId}
            className="d-flex align-items-center gap-1 px-2 py-1 rounded"
            style={{
              backgroundColor: `${user.color}20`,
              border: `1px solid ${user.color}`,
              position: 'relative',
            }}
            title={`${user.username} - ${user.status}${user.currentPersonId ? ` (viewing ${user.currentPersonId})` : ''}`}
          >
            {/* Avatar dot */}
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: user.color,
                opacity: user.status === 'idle' ? 0.5 : 1,
              }}
            />
            {/* Name */}
            <span className="small" style={{ fontSize: '12px' }}>
              {user.username}
            </span>
            {/* Status indicator */}
            {user.status === 'editing' && (
              <span style={{ fontSize: '10px', marginLeft: '2px' }}>✏</span>
            )}
            {user.status === 'idle' && (
              <span style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.6 }}>💤</span>
            )}
          </div>
        ))}
        {otherUsers.length > maxVisible && (
          <span className="text-muted small" style={{ fontSize: '12px' }}>
            +{otherUsers.length - maxVisible} more
          </span>
        )}
      </div>
    </div>
  );
};
