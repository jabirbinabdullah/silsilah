import React, { useEffect, useMemo, useState } from 'react';
import { GenealogyCommandBus } from '../commands/genealogyCommands';
import type { RenderNode } from '../api';

type AddRelationshipDrawerProps = {
  treeId: string;
  open: boolean;
  onClose: () => void;
  nodes: RenderNode[];
  prefill?: { parentId?: string; childId?: string };
  onCreated: (childId: string) => void;
};

import { withErrorBoundary } from '../utils/withErrorBoundary';

const AddRelationshipDrawerInner: React.FC<AddRelationshipDrawerProps> = ({
  treeId,
  open,
  onClose,
  nodes,
  prefill,
  onCreated,
}) => {
  const [parentId, setParentId] = useState<string>('');
  const [childId, setChildId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setParentId(prefill?.parentId || '');
      setChildId(prefill?.childId || '');
      setError(null);
    } else {
      // reset when closed
      setParentId('');
      setChildId('');
      setSaving(false);
      setError(null);
    }
  }, [open, prefill?.parentId, prefill?.childId]);

  const options = useMemo(() => nodes.map((n) => ({ value: n.id, label: n.displayName })), [nodes]);

  const validate = (): string | null => {
    if (!parentId || !childId) return 'Both Parent ID and Child ID are required';
    if (parentId === childId) return 'Parent and Child must be different people';
    return null;
  };

  const handleSave = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await GenealogyCommandBus.addParentChildRelationship({
        treeId,
        parentId: parentId.trim(),
        childId: childId.trim(),
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to create relationship');
        return;
      }
      
      onCreated(childId.trim());
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create relationship');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`offcanvas offcanvas-end ${open ? 'show' : ''}`}
        tabIndex={-1}
        id="addRelationshipOffcanvas"
        aria-labelledby="addRelationshipOffcanvasLabel"
        style={{ visibility: open ? 'visible' : 'hidden', maxWidth: '480px', width: '100%' }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title" id="addRelationshipOffcanvasLabel">
            Add Parent–Child Relationship
          </h5>
          <button type="button" className="btn-close text-reset" onClick={onClose} aria-label="Close"></button>
        </div>
        <div className="offcanvas-body d-flex flex-column">
          <form
            className="flex-grow-1 d-flex flex-column"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="flex-grow-1 overflow-y-auto p-3">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="mb-3">
                <label htmlFor="parentId" className="form-label">
                  Parent ID <span className="text-danger">*</span>
                </label>
                <input
                  id="parentId"
                  className="form-control"
                  list="relationship-persons"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  placeholder="Select or type a person ID"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="childId" className="form-label">
                  Child ID <span className="text-danger">*</span>
                </label>
                <input
                  id="childId"
                  className="form-control"
                  list="relationship-persons"
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  placeholder="Select or type a person ID"
                />
              </div>

              <datalist id="relationship-persons">
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </datalist>

              <div className="form-text">Typeahead: choose by ID; labels show names.</div>
            </div>

            <div className="p-3 bg-light border-top d-flex justify-content-end gap-2">
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create Relationship'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {open && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}
    </>
  );
};

export const AddRelationshipDrawer = withErrorBoundary(AddRelationshipDrawerInner);
