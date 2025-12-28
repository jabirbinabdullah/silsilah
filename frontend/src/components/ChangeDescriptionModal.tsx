import React, { useState } from 'react';
import { GenealogyCommandBus } from '../commands/genealogyCommands';

interface ChangeDescriptionModalProps {
  isOpen: boolean;
  treeId: string;
  treeName: string;
  currentDescription: string | undefined;
  onClose: () => void;
  onSuccess: (newDescription: string) => void;
}

const ChangeDescriptionModal: React.FC<ChangeDescriptionModalProps> = ({
  isOpen,
  treeId,
  treeName,
  currentDescription,
  onClose,
  onSuccess,
}) => {
  const [description, setDescription] = useState(currentDescription || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await GenealogyCommandBus.updateTree({
        treeId,
        description: description || undefined,
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to update description');
        return;
      }
      
      onSuccess(description);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update description');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Change Description</h2>
          <p className="text-sm text-gray-600 mt-1">{treeName}</p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter tree description (optional)..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">
            {description.length} / 500 characters
          </p>
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
            onClick={handleSave}
            className="flex-1 py-2 px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeDescriptionModal;
