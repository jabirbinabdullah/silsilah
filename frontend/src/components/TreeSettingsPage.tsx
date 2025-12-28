import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTrees } from '../api';
import { GenealogyCommandBus } from '../commands/genealogyCommands';
import ExportModal from './ExportModal';
import ImportModal from './ImportModal';
import type { TreeListItem } from '../api';

const TreeSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { treeId } = useParams<{ treeId: string }>();
  const [tree, setTree] = useState<TreeListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [allTrees, setAllTrees] = useState<TreeListItem[]>([]);

  useEffect(() => {
    if (!treeId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getTrees();
        const found = response.trees.find((t) => t.treeId === treeId);
        if (found) {
          setTree(found);
          setAllTrees(response.trees);
          setName(found.name);
          setDescription(found.description || '');
          setVisibility(found.visibility || 'private');
        } else {
          setError('Tree not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tree');
      } finally {
        setLoading(false);
      }
    })();
  }, [treeId]);

  const handleSave = async () => {
    if (!treeId) return;

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await GenealogyCommandBus.updateTree({
        treeId,
        name: name || tree?.name,
        description: description || undefined,
        visibility,
      });
      
      if (!result.success) {
        setSaveError(result.error || 'Failed to save settings');
        return;
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const isOwner = tree?.role === 'OWNER';

  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center text-gray-500">Loading tree settings...</div>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="container py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || 'Tree not found'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-700 text-sm mb-4"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{tree.name}</h1>
        <p className="text-gray-600 mt-2">Tree Settings & Statistics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Statistics Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Persons</p>
                <p className="text-3xl font-bold text-blue-600">{tree.personCount}</p>
              </div>
              {tree.relationshipCount !== undefined && (
                <div>
                  <p className="text-sm text-gray-600">Relationships</p>
                  <p className="text-3xl font-bold text-green-600">{tree.relationshipCount}</p>
                </div>
              )}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(tree.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Modified</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(tree.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Your Role</p>
                <span
                  className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                    tree.role === 'OWNER'
                      ? 'bg-purple-100 text-purple-800'
                      : tree.role === 'EDITOR'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {tree.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Edit Settings</h2>

            {saveSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                ✓ Settings saved successfully
              </div>
            )}

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {saveError}
              </div>
            )}

            <div className="space-y-6">
              {/* Tree Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tree Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                {!isOwner && <p className="text-xs text-gray-500 mt-1">Owners only</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isOwner}
                  placeholder="Add notes about this family tree..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length} / 500 characters {!isOwner && '(Owners only)'}
                </p>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                  disabled={!isOwner}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="private">Private (Only you)</option>
                  <option value="public">Public (Anyone with link)</option>
                </select>
                {!isOwner && <p className="text-xs text-gray-500 mt-1">Owners only</p>}
              </div>

              {/* Save Button */}
              {isOwner && (
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                >
                  {saveLoading ? 'Saving...' : 'Save Settings'}
                </button>
              )}
            </div>
          </div>

          {/* Import/Export Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setExportModalOpen(true)}
                className="py-3 px-4 bg-green-50 hover:bg-green-100 border border-green-300 rounded-lg text-green-900 font-medium transition flex items-center justify-center gap-2"
              >
                ⬇️ Export Tree
              </button>
              <button
                onClick={() => setImportModalOpen(true)}
                className="py-3 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg text-blue-900 font-medium transition flex items-center justify-center gap-2"
              >
                ⬆️ Import Data
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Export your tree for backup or import data from JSON/GEDCOM files.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {tree && (
        <>
          <ExportModal isOpen={exportModalOpen} tree={tree} onClose={() => setExportModalOpen(false)} />
          <ImportModal
            isOpen={importModalOpen}
            existingTrees={allTrees}
            onClose={() => setImportModalOpen(false)}
            onSuccess={(newTreeId) => {
              setImportModalOpen(false);
              navigate(`/trees/${encodeURIComponent(newTreeId)}`);
            }}
          />
        </>
      )}
    </div>
  );
};

export default TreeSettingsPage;
