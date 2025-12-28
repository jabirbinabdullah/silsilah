/**
 * Types for multi-user collaboration features
 */

export interface UserPresence {
  userId: string;
  username: string;
  color: string; // Hex color for presence indicator
  status: 'viewing' | 'editing' | 'idle';
  lastActiveAt: number; // Timestamp
  currentPersonId?: string; // Person currently editing/viewing
  sessionId: string; // Unique session identifier
}

export interface ActivityEntry {
  id: string;
  type: 'add-person' | 'edit-person' | 'delete-person' | 'add-relationship' | 'delete-relationship' | 'login' | 'logout';
  userId: string;
  username: string;
  timestamp: number;
  description: string; // Human-readable description
  personId?: string; // For person-related activities
  personName?: string;
  relationshipId?: string; // For relationship-related activities
  metadata?: Record<string, any>; // Additional data like old/new values
}

export interface EditConflict {
  id: string; // Unique conflict ID
  personId: string;
  personName: string;
  conflictType: 'concurrent-edit' | 'deleted-while-editing' | 'modified-externally';
  conflictingUserId: string;
  conflictingUsername: string;
  timestamp: number;
  suggestedResolution?: {
    keepLocal: Record<string, any>; // Local changes
    keepRemote: Record<string, any>; // Remote changes
    merged?: Record<string, any>; // Suggested merged version
  };
}

export interface CollaborationState {
  activeUsers: UserPresence[];
  activityLog: ActivityEntry[];
  activeConflicts: EditConflict[];
  liveUpdatesEnabled: boolean;
  currentUserId: string;
  currentSessionId: string;
}

export interface PresenceUpdate {
  userId: string;
  sessionId: string;
  treeId: string;
  status: 'viewing' | 'editing' | 'idle';
  currentPersonId?: string;
}

export interface ActivityLog {
  treeId: string;
  entries: ActivityEntry[];
  hasMore: boolean;
  total: number;
}

export type UserColor = 
  | '#FF6B6B' // Red
  | '#4ECDC4' // Teal
  | '#45B7D1' // Blue
  | '#FFA07A' // Salmon
  | '#98D8C8' // Mint
  | '#F7DC6F' // Yellow
  | '#BB8FCE' // Purple
  | '#85C1E2'; // Light Blue

export const USER_COLORS: UserColor[] = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
];

// Helper to get a consistent color for a user
export const getColorForUser = (userId: string): UserColor => {
  const index = userId.charCodeAt(0) % USER_COLORS.length;
  return USER_COLORS[index];
};
