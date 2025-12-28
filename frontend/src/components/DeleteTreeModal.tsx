import React, { useState } from 'react';
import { GenealogyCommandBus } from '../commands/genealogyCommands';
import type { TreeListItem } from '../api';

interface DeleteTreeModalProps {
  isOpen: boolean;
  tree: TreeListItem;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteTreeModal: React.FC<DeleteTreeModalProps> = ({
  isOpen,
  tree,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = async () => {
    if (!confirmed) {
      setError('Please confirm deletion');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await GenealogyCommandBus.deleteTree(tree.treeId);
      
      if (!result.success) {
        setError(result.error || 'Failed to delete tree');
        return;
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tree');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-6 border-b border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-900">⚠️ Delete Tree</h2>
          <p className="text-sm text-red-700 mt-1">This action cannot be undone</p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-3">{tree.name}</p>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Persons:</span> {tree.personCount}
              </p>
              {tree.relationshipCount !== undefined && (
                <p>
                  <span className="font-medium">Relationships:</span> {tree.relationshipCount}
                </p>
              )}
              <p>
                <span className="font-medium">Last modified:</span>{' '}
                {new Date(tree.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <p className="font-medium mb-1">⚠️ Warning:</p>
            <p>
              This will permanently delete this tree and all {tree.personCount} associated
              {tree.personCount === 1 ? ' person' : ' persons'}.
            </p>
          </div>

          <label className="flex items-start gap-3 mt-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-700">
              I understand this is permanent and will delete all data in this tree.
            </span>
          </label>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-2 px-4 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium transition disabled:opacity-50"
            disabled={loading || !confirmed}
          >
            {loading ? 'Deleting...' : 'Delete Tree'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTreeModal;
