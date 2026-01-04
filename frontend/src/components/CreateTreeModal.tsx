import React, { useState, useEffect } from 'react';
import { getTrees, type TreeListResponse } from '../api';
import { GenealogyCommandBus } from '../commands/genealogyCommands';

interface CreateTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (treeId: string) => void;
}

interface TreeOption {
  treeId: string;
  name: string;
}

const CreateTreeModal: React.FC<CreateTreeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'create' | 'duplicate'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTrees, setAvailableTrees] = useState<TreeOption[]>([]);
  const [loadingTrees, setLoadingTrees] = useState(false);

  // Form fields
  const [treeName, setTreeName] = useState('');
  const [treeDescription, setTreeDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [selectedSourceTree, setSelectedSourceTree] = useState<string>('');
  const [gedcomFile, setGedcomFile] = useState<File | null>(null);

  // Fetch available trees for duplication
  useEffect(() => {
    if (!isOpen || mode !== 'duplicate') return;
    
    (async () => {
      setLoadingTrees(true);
      try {
        const response = await getTrees();
        setAvailableTrees(response.trees.map((t: any) => ({ treeId: t.treeId, name: t.name })));
        if (response.trees.length > 0) {
          setSelectedSourceTree(response.trees[0].treeId);
        }
      } catch (err) {
        console.error('Failed to fetch trees:', err);
      } finally {
        setLoadingTrees(false);
      }
    })();
  }, [isOpen, mode]);

  const resetForm = () => {
    setTreeName('');
    setTreeDescription('');
    setVisibility('private');
    setSelectedSourceTree('');
    setGedcomFile(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateTree = async () => {
    if (!treeName.trim()) {
      setError('Tree name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (mode === 'create') {
        result = await GenealogyCommandBus.createTree({
          name: treeName,
          description: treeDescription || undefined,
          visibility,
        });
      } else {
        if (!selectedSourceTree) {
          setError('Please select a source tree to duplicate');
          setLoading(false);
          return;
        }
        result = await GenealogyCommandBus.duplicateTree({
          sourceTreeId: selectedSourceTree,
          newName: treeName,
        });
      }

      if (!result.success) {
        setError(result.error || 'Failed to create tree');
        setLoading(false);
        return;
      }

      // Note: GEDCOM import is a stretch goal for future implementation
      if (gedcomFile) {
        console.warn('GEDCOM import not yet implemented');
      }

      resetForm();
      onSuccess(result.treeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tree');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Tree</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {/* Mode Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How do you want to create?
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMode('create');
                  setError(null);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  mode === 'create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                New Tree
              </button>
              <button
                onClick={() => {
                  setMode('duplicate');
                  setError(null);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  mode === 'duplicate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Duplicate
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Tree Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tree Name *
            </label>
            <input
              type="text"
              value={treeName}
              onChange={(e) => setTreeName(e.target.value)}
              placeholder={mode === 'duplicate' ? 'My Tree Copy' : 'My Family Tree'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Create Mode Fields */}
          {mode === 'create' && (
            <>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={treeDescription}
                  onChange={(e) => setTreeDescription(e.target.value)}
                  placeholder="Optional notes about this family tree..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="private">Private (Only you)</option>
                  <option value="public">Public (Anyone with link)</option>
                </select>
              </div>

              {/* GEDCOM Import (Stretch Goal) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Import from GEDCOM
                </label>
                <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Coming soon</p>
                  <input
                    type="file"
                    accept=".ged,.gedcom"
                    onChange={(e) => setGedcomFile(e.target.files?.[0] || null)}
                    disabled
                    className="mt-2 text-sm text-gray-500 opacity-50 cursor-not-allowed"
                  />
                </div>
              </div>
            </>
          )}

          {/* Duplicate Mode Fields */}
          {mode === 'duplicate' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Source Tree *
              </label>
              {loadingTrees ? (
                <div className="p-3 text-center text-gray-500">Loading trees...</div>
              ) : availableTrees.length === 0 ? (
                <div className="p-3 text-center text-gray-500">No trees available</div>
              ) : (
                <select
                  value={selectedSourceTree}
                  onChange={(e) => setSelectedSourceTree(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableTrees.map((tree) => (
                    <option key={tree.treeId} value={tree.treeId}>
                      {tree.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateTree}
            className="flex-1 py-2 px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading && <span className="animate-spin">⏳</span>}
            {mode === 'create' ? 'Create Tree' : 'Duplicate Tree'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTreeModal;
