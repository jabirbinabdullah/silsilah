import React, { useState } from 'react';
import { EditConflict } from '../types/collaboration';

interface EditConflictWarningProps {
  conflict: EditConflict;
  onResolve: (resolution: 'keep-local' | 'keep-remote' | 'merge') => void;
  onDismiss?: () => void;
}

export const EditConflictWarning: React.FC<EditConflictWarningProps> = ({
  conflict,
  onResolve,
  onDismiss,
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'keep-local' | 'keep-remote' | 'merge' | null>(null);

  return (
    <div
      className="alert alert-warning alert-dismissible fade show"
      role="alert"
      style={{
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        borderLeftColor: '#ff9800',
      }}
    >
      <div className="d-flex gap-2 align-items-start">
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <div className="flex-grow-1">
          <h5 className="alert-heading mb-2">Edit Conflict Detected</h5>
          <p className="mb-2 small">
            <strong>{conflict.conflictingUsername}</strong> is also editing{' '}
            <strong>{conflict.personName}</strong>. There may be conflicting changes.
          </p>

          <div className="mt-3">
            <p className="small text-muted mb-2">How would you like to resolve this?</p>
            <div className="btn-group d-flex gap-2" role="group" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${
                  selectedResolution === 'keep-local' ? 'btn-primary' : 'btn-outline-primary'
                }`}
                onClick={() => {
                  setSelectedResolution('keep-local');
                  onResolve('keep-local');
                }}
              >
                💾 Keep My Changes
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  selectedResolution === 'keep-remote' ? 'btn-warning' : 'btn-outline-warning'
                }`}
                onClick={() => {
                  setSelectedResolution('keep-remote');
                  onResolve('keep-remote');
                }}
              >
                🔄 Accept Their Changes
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  selectedResolution === 'merge' ? 'btn-info' : 'btn-outline-info'
                }`}
                onClick={() => {
                  setSelectedResolution('merge');
                  onResolve('merge');
                }}
              >
                🔀 Merge Both
              </button>
            </div>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            className="btn-close"
            onClick={onDismiss}
            aria-label="Close"
          />
        )}
      </div>
    </div>
  );
};

/**
 * Modal-based conflict resolver for more detailed resolution
 */
interface EditConflictModalProps {
  conflict: EditConflict;
  isOpen: boolean;
  onResolve: (resolution: 'keep-local' | 'keep-remote' | 'merge') => void;
  onClose: () => void;
}

export const EditConflictModal: React.FC<EditConflictModalProps> = ({
  conflict,
  isOpen,
  onResolve,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      role="dialog"
      aria-labelledby="conflictModalLabel"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content border-warning">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title" id="conflictModalLabel">
              ⚠️ Edit Conflict
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          <div className="modal-body">
            <div className="alert alert-light">
              <p className="mb-0">
                <strong>{conflict.conflictingUsername}</strong> is also editing{' '}
                <strong>{conflict.personName}</strong> at the same time. This may result in
                conflicting changes.
              </p>
            </div>

            {conflict.conflictType === 'concurrent-edit' && (
              <div>
                <h6 className="mb-2">Concurrent Edit</h6>
                <p className="small text-muted">
                  Both you and {conflict.conflictingUsername} have made changes to this person.
                  You need to choose which version to keep.
                </p>
              </div>
            )}

            {conflict.conflictType === 'deleted-while-editing' && (
              <div>
                <h6 className="mb-2">Deleted While Editing</h6>
                <p className="small text-muted">
                  {conflict.conflictingUsername} deleted {conflict.personName} while you were
                  editing it.
                </p>
              </div>
            )}

            {conflict.conflictType === 'modified-externally' && (
              <div>
                <h6 className="mb-2">Modified Externally</h6>
                <p className="small text-muted">
                  {conflict.conflictingUsername} modified {conflict.personName} after you opened
                  it for editing.
                </p>
              </div>
            )}

            {/* Field comparison if available */}
            {conflict.suggestedResolution && (
              <div className="mt-3 p-3 bg-light rounded">
                <h6 className="mb-2">Field Comparison</h6>
                <table className="table table-sm table-borderless">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Field</th>
                      <th style={{ width: '35%' }}>Your Changes</th>
                      <th style={{ width: '35%' }}>Their Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(conflict.suggestedResolution.keepLocal || {}).map(
                      ([key, value]) => (
                        <tr key={key}>
                          <td className="text-muted small">{key}</td>
                          <td className="bg-success bg-opacity-10 small">
                            {String(value)}
                          </td>
                          <td className="bg-warning bg-opacity-10 small">
                            {String(
                              conflict.suggestedResolution?.keepRemote?.[key] || '—'
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="modal-footer bg-light">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                onResolve('keep-local');
                onClose();
              }}
            >
              ✓ Keep My Changes
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={() => {
                onResolve('keep-remote');
                onClose();
              }}
            >
              🔄 Accept Their Changes
            </button>
            <button
              type="button"
              className="btn btn-info"
              onClick={() => {
                onResolve('merge');
                onClose();
              }}
            >
              🔀 Merge Both
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple badge/indicator for when someone is editing a specific person
 */
interface PersonEditingIndicatorProps {
  editorUsername: string;
  personName: string;
  showAsWarning?: boolean;
}

export const PersonEditingIndicator: React.FC<PersonEditingIndicatorProps> = ({
  editorUsername,
  personName,
  showAsWarning = false,
}) => {
  return (
    <div
      className={`alert alert-${showAsWarning ? 'danger' : 'info'} mb-2 py-2 px-3`}
      role="alert"
      style={{ fontSize: '12px' }}
    >
      <strong>{editorUsername}</strong> is currently editing <strong>{personName}</strong> 📝
    </div>
  );
};
