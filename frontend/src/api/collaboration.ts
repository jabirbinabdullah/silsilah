import {
  UserPresence,
  ActivityEntry,
  ActivityLog,
  PresenceUpdate,
  EditConflict,
} from '../types/collaboration';

const getBaseUrl = (): string => {
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  const fromStorage = localStorage.getItem('apiBaseUrl') || undefined;
  return (fromStorage || fromEnv || 'http://localhost:3000').replace(/\/$/, '');
};

/**
 * Register presence for current user in a tree
 */
export const registerPresence = async (
  treeId: string,
  userId: string,
  sessionId: string,
  username: string,
): Promise<UserPresence[]> => {
  const response = await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/presence/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId, username }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to register presence');
  }

  return response.json();
};

/**
 * Update presence status for current user
 */
export const updatePresence = async (
  treeId: string,
  update: PresenceUpdate,
): Promise<UserPresence[]> => {
  const response = await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/presence/update`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update presence');
  }

  return response.json();
};

/**
 * Get active users in a tree
 */
export const getActiveUsers = async (treeId: string): Promise<UserPresence[]> => {
  const response = await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/presence`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch active users');
  }

  return response.json();
};

/**
 * Unregister presence when leaving a tree
 */
export const unregisterPresence = async (
  treeId: string,
  userId: string,
  sessionId: string,
): Promise<void> => {
  await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/presence/unregister`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId }),
    }
  );
};

/**
 * Get activity log for a tree
 */
export const getActivityLog = async (
  treeId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<ActivityLog> => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/activity?${params}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch activity log');
  }

  return response.json();
};

/**
 * Log an activity (used internally after operations)
 */
export const logActivity = async (
  treeId: string,
  activity: Omit<ActivityEntry, 'id' | 'timestamp'>
): Promise<ActivityEntry> => {
  const response = await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/activity/log`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to log activity');
  }

  return response.json();
};

/**
 * Check for edit conflicts
 */
export const checkEditConflict = async (
  treeId: string,
  personId: string,
  sessionId: string,
): Promise<EditConflict | null> => {
  const response = await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/conflicts/check`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, sessionId }),
    }
  );

  if (!response.ok) {
    return null; // No conflict
  }

  return response.json();
};

/**
 * Lock a person for editing
 */
export const lockPersonForEditing = async (
  treeId: string,
  personId: string,
  userId: string,
  sessionId: string,
): Promise<{ locked: boolean; message?: string }> => {
  const response = await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/locks/acquire`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, userId, sessionId }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to acquire lock');
  }

  return response.json();
};

/**
 * Release a lock after editing
 */
export const releasePersonLock = async (
  treeId: string,
  personId: string,
  sessionId: string,
): Promise<void> => {
  const response = await fetch(
    `${getBaseUrl()}/api/trees/${treeId}/locks/release`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, sessionId }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to release lock');
  }
};

/**
 * Get WebSocket URL for real-time updates (if available)
 */
export const getWebSocketUrl = (treeId: string): string => {
  const baseUrl = getBaseUrl();
  const wsUrl = baseUrl.replace(/^http/, 'ws');
  return `${wsUrl}/api/trees/${treeId}/ws`;
};
