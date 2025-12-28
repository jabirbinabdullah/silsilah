import React, { useState } from 'react';
import { importTreePreview, importTree, getTrees } from '../api';
import ImportPreview from './ImportPreview';
import type { TreeListItem, ImportPreviewData } from '../api';

interface ImportModalProps {
  isOpen: boolean;
  existingTrees: TreeListItem[];
  onClose: () => void;
  onSuccess: (treeId: string) => void;
}

type ImportStep = 'upload' | 'preview' | 'confirm';

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  existingTrees,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'new' | 'existing'>('new');
  const [selectedTargetTree, setSelectedTargetTree] = useState<string>(
    existingTrees.length > 0 ? existingTrees[0].treeId : ''
  );
  const [newTreeName, setNewTreeName] = useState('');
  const [handleDuplicates, setHandleDuplicates] = useState<'skip' | 'merge' | 'replace'>('skip');

  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleLoadPreview = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (importMode === 'existing' && !selectedTargetTree) {
      setError('Please select a target tree');
      return;
    }

    if (importMode === 'new' && !newTreeName.trim()) {
      setError('Please enter a name for the new tree');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(25);

    try {
      setProgress(50);
      const previewData = await importTreePreview(
        file,
        importMode === 'existing' ? selectedTargetTree : undefined
      );
      setProgress(75);
      setPreview(previewData);
      setProgress(100);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !preview) return;

    setLoading(true);
    setError(null);
    setProgress(25);

    try {
      setProgress(50);
      const result = await importTree(file, {
        createNewTree: importMode === 'new',
        newTreeName: importMode === 'new' ? newTreeName : undefined,
        targetTreeId: importMode === 'existing' ? selectedTargetTree : undefined,
        handleDuplicates,
      });
      setProgress(75);

      // Refresh tree list and close modal
      setProgress(100);
      onSuccess(result.treeId);
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import tree');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setImportMode('new');
    setNewTreeName('');
    setSelectedTargetTree(existingTrees.length > 0 ? existingTrees[0].treeId : '');
    setHandleDuplicates('skip');
    setPreview(null);
    setError(null);
    setProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'upload' ? '📥 Import Tree Data' : step === 'preview' ? '👀 Preview' : '✓ Complete'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {step === 'upload'
              ? 'Select a JSON or GEDCOM file to import'
              : step === 'preview'
              ? 'Review the data before importing'
              : 'Import completed successfully'}
          </p>
        </div>

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">JSON or GEDCOM files</p>
                    </div>
                    <input
                      type="file"
                      accept=".json,.ged,.gedcom"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                {file && (
                  <p className="mt-2 text-sm text-green-700">
                    ✓ Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* Import Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Import Into
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="new"
                      checked={importMode === 'new'}
                      onChange={() => setImportMode('new')}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Create New Tree</p>
                      <p className="text-xs text-gray-600">Will create a new tree with the imported data</p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="existing"
                      checked={importMode === 'existing'}
                      onChange={() => setImportMode('existing')}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Merge Into Existing Tree</p>
                      <p className="text-xs text-gray-600">Combine data with an existing tree</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tree Name (for new trees) */}
              {importMode === 'new' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Tree Name *
                  </label>
                  <input
                    type="text"
                    value={newTreeName}
                    onChange={(e) => setNewTreeName(e.target.value)}
                    placeholder="e.g., Smith Family Tree"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Target Tree (for existing trees) */}
              {importMode === 'existing' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Tree *
                  </label>
                  {existingTrees.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No trees available</p>
                  ) : (
                    <select
                      value={selectedTargetTree}
                      onChange={(e) => setSelectedTargetTree(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {existingTrees.map((tree) => (
                        <option key={tree.treeId} value={tree.treeId}>
                          {tree.name} ({tree.personCount} persons)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Duplicate Handling */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handle Duplicates
                </label>
                <select
                  value={handleDuplicates}
                  onChange={(e) => setHandleDuplicates(e.target.value as 'skip' | 'merge' | 'replace')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="skip">Skip duplicates (recommended)</option>
                  <option value="merge">Merge with existing data</option>
                  <option value="replace">Replace with imported data</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Duplicates are detected by name and birth date similarity
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <ImportPreview
              preview={preview}
              onConfirm={handleConfirmImport}
              onBack={() => setStep('upload')}
              loading={loading}
            />
          )}
        </div>

        {/* Footer */}
        {step !== 'preview' && (
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={resetModal}
              className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            {step === 'upload' && (
              <button
                onClick={handleLoadPreview}
                disabled={!file || loading}
                className="flex-1 py-2 px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <span className="animate-spin">⏳</span>}
                {loading ? 'Validating...' : 'Next: Preview'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
