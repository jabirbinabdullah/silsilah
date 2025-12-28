import React, { useState } from 'react';
import { GenealogyCommandBus } from '../commands/genealogyCommands';

interface RenameTreeModalProps {
  isOpen: boolean;
  treeName: string;
  treeId: string;
  onClose: () => void;
  onSuccess: (newName: string) => void;
}

const RenameTreeModal: React.FC<RenameTreeModalProps> = ({
  isOpen,
  treeName,
  treeId,
  onClose,
  onSuccess,
}) => {
  const [newName, setNewName] = useState(treeName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRename = async () => {
    if (!newName.trim()) {
      setError('Tree name cannot be empty');
      return;
    }

    if (newName === treeName) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await GenealogyCommandBus.updateTree({
        treeId,
        name: newName,
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to rename tree');
        return;
      }
      
      onSuccess(newName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename tree');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Rename Tree</h2>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter new tree name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            className="flex-1 py-2 px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameTreeModal;
