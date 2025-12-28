import { useState, useCallback, useRef } from 'react';

export type UndoRedoAction = {
  type: 'add-person' | 'edit-person' | 'delete-person' | 'add-relationship' | 'delete-relationship';
  description: string;
  timestamp: number;
  data: Record<string, any>;
  inverseData: Record<string, any>;
  execute: (data: Record<string, any>) => Promise<void>;
  inverse: (data: Record<string, any>) => Promise<void>;
};

interface UndoRedoState {
  undoStack: UndoRedoAction[];
  redoStack: UndoRedoAction[];
}

export const useUndoRedo = (maxStackSize: number = 50) => {
  const [state, setState] = useState<UndoRedoState>({
    undoStack: [],
    redoStack: [],
  });

  const isExecutingRef = useRef(false);

  // Record an action
  const recordAction = useCallback(
    (action: UndoRedoAction) => {
      setState(prev => {
        const newUndoStack = [action, ...prev.undoStack];
        // Trim if exceeds max size
        if (newUndoStack.length > maxStackSize) {
          newUndoStack.pop();
        }

        return {
          undoStack: newUndoStack,
          redoStack: [], // Clear redo stack when new action is performed
        };
      });
    },
    [maxStackSize]
  );

  // Undo action
  const undo = useCallback(async () => {
    if (isExecutingRef.current || state.undoStack.length === 0) return;

    isExecutingRef.current = true;
    try {
      const action = state.undoStack[0];
      await action.inverse(action.inverseData);

      setState(prev => ({
        undoStack: prev.undoStack.slice(1),
        redoStack: [action, ...prev.redoStack],
      }));

      return action.description;
    } finally {
      isExecutingRef.current = false;
    }
  }, [state.undoStack]);

  // Redo action
  const redo = useCallback(async () => {
    if (isExecutingRef.current || state.redoStack.length === 0) return;

    isExecutingRef.current = true;
    try {
      const action = state.redoStack[0];
      await action.execute(action.data);

      setState(prev => ({
        redoStack: prev.redoStack.slice(1),
        undoStack: [action, ...prev.undoStack],
      }));

      return action.description;
    } finally {
      isExecutingRef.current = false;
    }
  }, [state.redoStack]);

  // Clear all stacks
  const clear = useCallback(() => {
    setState({
      undoStack: [],
      redoStack: [],
    });
  }, []);

  return {
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    undoStackSize: state.undoStack.length,
    redoStackSize: state.redoStack.length,
    undoDescription: state.undoStack[0]?.description,
    redoDescription: state.redoStack[0]?.description,
    recordAction,
    undo,
    redo,
    clear,
  };
};
