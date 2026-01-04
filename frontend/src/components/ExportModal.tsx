import React, { useState } from 'react';
import { exportTree } from '../api';
import type { TreeListItem } from '../api';

interface ExportModalProps {
  isOpen: boolean;
  tree: TreeListItem | null;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, tree, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<'json-full' | 'json-minimal' | 'gedcom'>(
    'json-full'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!tree) return;

    setLoading(true);
    setError(null);

    try {
      const blob = await exportTree(tree.treeId, selectedFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const fileExtension = selectedFormat === 'gedcom' ? 'ged' : 'json';
      const fileName = `${tree.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
      a.download = fileName;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export tree');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !tree) return null;

  const formatDescriptions = {
    'json-full': 'Complete tree data including all metadata (recommended for backups)',
    'json-minimal': 'Minimal JSON with only essential data (persons and relationships)',
    gedcom: 'GEDCOM format compatible with genealogy software',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Export Tree</h2>
          <p className="text-sm text-gray-600 mt-1">{tree.name}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Format
            </label>
            <div className="space-y-3">
              {(['json-full', 'json-minimal', 'gedcom'] as const).map((format) => (
                <label
                  key={format}
                  className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                >
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    checked={selectedFormat === format}
                    onChange={(e) => setSelectedFormat(e.target.value as typeof format)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {format === 'json-full'
                        ? '📦 JSON (Full)'
                        : format === 'json-minimal'
                        ? '📄 JSON (Minimal)'
                        : '🧬 GEDCOM'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatDescriptions[format]}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Data Summary */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-900 mb-2">What will be exported:</p>
            <ul className="space-y-1 text-gray-700">
              <li>✓ {tree.personCount} person{tree.personCount !== 1 ? 's' : ''}</li>
              {tree.relationshipCount !== undefined && (
                <li>✓ {tree.relationshipCount} relationship{tree.relationshipCount !== 1 ? 's' : ''}</li>
              )}
              {selectedFormat !== 'json-minimal' && (
                <>
                  <li>✓ Tree metadata (name, description)</li>
                  <li>✓ Full person details (dates, places)</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-2 px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading && <span className="animate-spin">⏳</span>}
            {loading ? 'Exporting...' : '⬇️ Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
