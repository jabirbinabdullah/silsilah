import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  UserPresence,
  ActivityEntry,
  EditConflict,
  getColorForUser,
} from '../types/collaboration';
import {
  registerPresence,
  updatePresence,
  getActiveUsers,
  unregisterPresence,
  getActivityLog,
  checkEditConflict,
  lockPersonForEditing,
  releasePersonLock,
} from '../api/collaboration';

interface CollaborationContextType {
  // Presence
  activeUsers: UserPresence[];
  currentUserId: string;
  currentSessionId: string;
  currentUsername: string;
  
  // Activity
  activities: ActivityEntry[];
  hasMoreActivities: boolean;
  loadMoreActivities: () => Promise<void>;
  
  // Conflicts
  activeConflicts: EditConflict[];
  resolveConflict: (conflictId: string, resolution: 'keep-local' | 'keep-remote' | 'merge') => void;
  
  // Settings
  liveUpdatesEnabled: boolean;
  setLiveUpdatesEnabled: (enabled: boolean) => void;
  
  // Actions
  registerUserPresence: (treeId: string) => Promise<void>;
  updateUserPresence: (treeId: string, status: 'viewing' | 'editing' | 'idle', personId?: string) => Promise<void>;
  unregisterUserPresence: (treeId: string) => Promise<void>;
  
  // Locks
  lockPerson: (treeId: string, personId: string) => Promise<boolean>;
  unlockPerson: (treeId: string, personId: string) => Promise<void>;
  checkConflict: (treeId: string, personId: string) => Promise<EditConflict | null>;
  
  // Utilities
  getUserColor: (userId: string) => string;
  getOtherUsers: () => UserPresence[];
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activeConflicts, setActiveConflicts] = useState<EditConflict[]>([]);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true);
  const [activityOffset, setActivityOffset] = useState(0);
  
  // Get or create user ID
  const getUserId = (): string => {
    const stored = localStorage.getItem('silsilah:userId');
    if (stored) return stored;
    const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('silsilah:userId', newId);
    return newId;
  };

  // Get or create username
  const getUsername = (userId: string): string => {
    const stored = localStorage.getItem('silsilah:username');
    return stored || `User-${userId.slice(-4)}`;
  };

  const userIdRef = useRef<string>(getUserId());
  const currentUserIdRef = useRef<string>(userIdRef.current);
  const currentSessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const currentUsernameRef = useRef<string>(getUsername(userIdRef.current));
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTreeIdRef = useRef<string>('');
  const lockedPersonsRef = useRef<Set<string>>(new Set());

  const loadActivities = useCallback(async (treeId: string, isMore: boolean = false) => {
    try {
      const result = await getActivityLog(treeId, 50, isMore ? activityOffset : 0);
      if (isMore) {
        setActivities(prev => [...prev, ...result.entries]);
        setActivityOffset(prev => prev + 50);
      } else {
        setActivities(result.entries);
        setActivityOffset(50);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }, [activityOffset]);

  const registerUserPresence = useCallback(async (treeId: string) => {
    currentTreeIdRef.current = treeId;
    try {
      const users = await registerPresence(
        treeId,
        currentUserIdRef.current,
        currentSessionIdRef.current,
        currentUsernameRef.current
      );
      setActiveUsers(users);
      
      // Load initial activities
      await loadActivities(treeId);
      
      // Start polling for presence updates
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      if (liveUpdatesEnabled) {
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const updatedUsers = await getActiveUsers(treeId);
            setActiveUsers(updatedUsers);
          } catch (error) {
            console.error('Failed to update presence:', error);
          }
        }, 3000); // Poll every 3 seconds
      }
    } catch (error) {
      console.error('Failed to register presence:', error);
    }
  }, [liveUpdatesEnabled, loadActivities]);

  const updateUserPresence = useCallback(async (treeId: string, status: 'viewing' | 'editing' | 'idle', personId?: string) => {
    try {
      const users = await updatePresence(treeId, {
        userId: currentUserIdRef.current,
        sessionId: currentSessionIdRef.current,
        treeId,
        status,
        currentPersonId: personId,
      });
      setActiveUsers(users);
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, []);

  const unregisterUserPresence = useCallback(async (treeId: string) => {
    try {
      await unregisterPresence(treeId, currentUserIdRef.current, currentSessionIdRef.current);
      setActiveUsers(prev => prev.filter(u => u.userId !== currentUserIdRef.current));
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } catch (error) {
      console.error('Failed to unregister presence:', error);
    }
  }, []);

  const lockPerson = useCallback(async (treeId: string, personId: string): Promise<boolean> => {
    try {
      const result = await lockPersonForEditing(
        treeId,
        personId,
        currentUserIdRef.current,
        currentSessionIdRef.current
      );
      
      if (result.locked) {
        lockedPersonsRef.current.add(personId);
      }
      
      return result.locked;
    } catch (error) {
      console.error('Failed to lock person:', error);
      return false;
    }
  }, []);

  const unlockPerson = useCallback(async (treeId: string, personId: string) => {
    try {
      await releasePersonLock(treeId, personId, currentSessionIdRef.current);
      lockedPersonsRef.current.delete(personId);
    } catch (error) {
      console.error('Failed to unlock person:', error);
    }
  }, []);

  const checkConflict = useCallback(async (treeId: string, personId: string): Promise<EditConflict | null> => {
    try {
      const conflict = await checkEditConflict(treeId, personId, currentSessionIdRef.current);
      if (conflict) {
        setActiveConflicts(prev => [...prev.filter(c => c.personId !== personId), conflict]);
      }
      return conflict;
    } catch (error) {
      console.error('Failed to check conflict:', error);
      return null;
    }
  }, []);

  const resolveConflict = useCallback((conflictId: string, resolution: 'keep-local' | 'keep-remote' | 'merge') => {
    setActiveConflicts(prev => prev.filter(c => c.id !== conflictId));
  }, []);

  const getUserColor = useCallback((userId: string): string => {
    return getColorForUser(userId as any);
  }, []);

  const getOtherUsers = useCallback((): UserPresence[] => {
    return activeUsers.filter(u => u.userId !== currentUserIdRef.current);
  }, [activeUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const value: CollaborationContextType = {
    activeUsers,
    currentUserId: currentUserIdRef.current,
    currentSessionId: currentSessionIdRef.current,
    currentUsername: currentUsernameRef.current,
    activities,
    hasMoreActivities: activities.length > 0,
    loadMoreActivities: async () => {
      await loadActivities(currentTreeIdRef.current, true);
    },
    activeConflicts,
    resolveConflict,
    liveUpdatesEnabled,
    setLiveUpdatesEnabled,
    registerUserPresence,
    updateUserPresence,
    unregisterUserPresence,
    lockPerson,
    unlockPerson,
    checkConflict,
    getUserColor,
    getOtherUsers,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaboration = (): CollaborationContextType => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
};
