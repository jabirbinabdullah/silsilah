import React from 'react';
import type { ImportPreviewData } from '../api';

interface ImportPreviewProps {
  preview: ImportPreviewData;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}

const ImportPreview: React.FC<ImportPreviewProps> = ({ preview, onConfirm, onBack, loading }) => {
  const { data, validation, existingDuplicates } = preview;
  const { summary, errors, warnings } = validation;

  const hasErrors = errors.length > 0;
  const canProceed = !hasErrors;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600">Persons to Import</p>
          <p className="text-2xl font-bold text-blue-900">{summary.personCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600">Relationships</p>
          <p className="text-2xl font-bold text-green-900">{summary.relationshipCount}</p>
        </div>
      </div>

      {/* Errors Section */}
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-900 mb-3">⚠️ Import Errors</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {errors.map((error, idx) => (
              <div key={idx} className="text-sm text-red-800">
                <p className="font-medium">Row {error.row} - {error.field}</p>
                <p className="text-xs text-red-700">{error.message}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-700 mt-3 font-medium">
            Please fix these errors in the source file and try again.
          </p>
        </div>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-3">⚠️ Warnings</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {warnings.map((warning, idx) => (
              <div key={idx} className="text-sm text-yellow-800">
                {warning.message}
              </div>
            ))}
          </div>
          <p className="text-xs text-yellow-700 mt-2">These won't prevent import but may need review.</p>
        </div>
      )}

      {/* Duplicates Section */}
      {existingDuplicates.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-medium text-orange-900 mb-3">🔍 Potential Duplicates Found</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {existingDuplicates.map((dup, idx) => (
              <div key={idx} className="bg-white border border-orange-200 rounded p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-orange-600 font-medium">To Import</p>
                    <p className="font-medium text-gray-900">{dup.importName}</p>
                    <p className="text-xs text-gray-500">ID: {dup.importId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-600 font-medium">Already Exists</p>
                    <p className="font-medium text-gray-900">{dup.existingName}</p>
                    <p className="text-xs text-gray-500">ID: {dup.existingId}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <p className="text-xs font-medium text-orange-700">
                    Similarity: {(dup.similarity * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-orange-700 mt-3">
            You can choose how to handle duplicates during import (skip, merge, or replace).
          </p>
        </div>
      )}

      {/* Data Preview */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Data Preview</h3>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Persons Preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Sample Persons ({data.persons.length})</p>
            <div className="space-y-2">
              {data.persons.slice(0, 5).map((person, idx) => (
                <div key={idx} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                  <p className="font-medium text-gray-900">{person.name}</p>
                  <p className="text-gray-600">
                    Gender: {person.gender} {person.birthDate && `| Born: ${person.birthDate}`}
                  </p>
                </div>
              ))}
              {data.persons.length > 5 && (
                <p className="text-xs text-gray-500 italic">
                  ... and {data.persons.length - 5} more
                </p>
              )}
            </div>
          </div>

          {/* Relationships Preview */}
          {data.relationships.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Sample Relationships ({data.relationships.length})
              </p>
              <div className="space-y-2">
                {data.relationships.slice(0, 5).map((rel, idx) => (
                  <div key={idx} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                    <p className="text-gray-900">
                      {rel.personAId} {rel.type === 'parent-child' ? '→ parent of →' : '↔ spouse ↔'}{' '}
                      {rel.personBId}
                    </p>
                  </div>
                ))}
                {data.relationships.length > 5 && (
                  <p className="text-xs text-gray-500 italic">
                    ... and {data.relationships.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
          disabled={loading}
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={!canProceed || loading}
          className={`flex-1 py-2 px-4 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 ${
            canProceed
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {loading && <span className="animate-spin">⏳</span>}
          {loading ? 'Importing...' : '✓ Confirm & Import'}
        </button>
      </div>
    </div>
  );
};

export default ImportPreview;
