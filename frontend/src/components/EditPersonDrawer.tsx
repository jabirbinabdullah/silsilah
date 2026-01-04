import React, { useEffect, useMemo, useState } from 'react';
import { PersonForm, validatePersonForm } from './PersonForm';
import { getPersonDetails, findDuplicates, mergePerson, type PersonDetails, type CreatePersonPayload, type RenderEdgeData } from '../api';
import { GenealogyCommandBus } from '../commands/genealogyCommands';
import { MergeDialog } from './MergeDialog';

// These are no longer directly called; use GenealogyCommandBus instead
// Previously imported: updatePerson, deletePerson

type EditPersonDrawerProps = {
  treeId: string;
  personId: string | null;
  onClose: () => void;
  onSuccess: (personId: string) => void;
  onDeleted: () => void;
  parents?: Array<{ personId: string; displayName: string }>;
  children?: Array<{ personId: string; displayName: string }>;
  spouses?: Array<{ personId: string; displayName: string }>;
  edges?: RenderEdgeData[];
};

import { withErrorBoundary } from '../utils/withErrorBoundary';

import { useToast } from './ToastNotification';

const EditPersonDrawerInner: React.FC<EditPersonDrawerProps> = ({ treeId, personId, onClose, onSuccess, onDeleted, parents = [], children = [], spouses = [], edges = [] }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePersonPayload>({ personId: '', name: '', gender: 'UNKNOWN' });
  const [saving, setSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [cascadeMode, setCascadeMode] = useState<'person-only' | 'with-children' | 'with-all-relationships'>('person-only');
  const [notice, setNotice] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ personId: string; displayName: string; similarity: number }>>([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<PersonDetails | null>(null);
  const [mergingPersonId, setMergingPersonId] = useState<string | null>(null);

  const isOpen = !!personId;

  useEffect(() => {
    if (!personId) {
      setForm({ personId: '', name: '', gender: 'UNKNOWN' });
      setError(null);
      setNotice(null);
      return;
    }
    setLoading(true);
    setError(null);
    getPersonDetails(treeId, personId)
      .then((p: PersonDetails) => {
        setForm({
          personId: p.personId,
          name: p.name || '',
          gender: (p.gender as any) || 'UNKNOWN',
          birthDate: p.birthDate ? new Date(p.birthDate).toISOString().slice(0, 10) : null,
          birthPlace: p.birthPlace || null,
          deathDate: p.deathDate ? new Date(p.deathDate).toISOString().slice(0, 10) : null,
        });
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load person');
      })
      .finally(() => setLoading(false));
  }, [treeId, personId]);

  const handleSave = async () => {
    const v = validatePersonForm(form);
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    const previousState = { ...form }; // Capture state for undo
    try {
      const result = await GenealogyCommandBus.updatePerson({
        treeId,
        personId: form.personId,
        name: form.name.trim(),
        gender: form.gender,
        birthDate: form.birthDate || null,
        birthPlace: form.birthPlace || null,
        deathDate: form.deathDate || null,
      });
      
      if (!result.success) {
        addToast(result.error || 'Failed to update person', 'error');
        return;
      }
      
      // setNotice('Person updated successfully.'); // Replaced by toast
      addToast('Person updated successfully.', 'success', 5000, {
        label: 'Undo',
        onClick: async () => {
          try {
            const undoResult = await GenealogyCommandBus.updatePerson({
              treeId,
              personId: previousState.personId,
              name: previousState.name,
              gender: previousState.gender,
              birthDate: previousState.birthDate || null,
              birthPlace: previousState.birthPlace || null,
              deathDate: previousState.deathDate || null,
            });
            if (undoResult.success) {
              addToast('Update undone.', 'info');
              onSuccess(previousState.personId);
            } else {
              addToast('Failed to undo update.', 'error');
            }
          } catch (e) {
            addToast('Failed to undo update.', 'error');
          }
        }
      });
      onSuccess(form.personId);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to update person');
    } finally {
      setSaving(false);
    }
  };

  // Debounced duplicate detection on name/date change
  useEffect(() => {
    if (!personId || !form.name.trim()) {
      setDuplicates([]);
      return;
    }
    const timer = setTimeout(async () => {
      const dups = await findDuplicates(treeId, form.name.trim(), form.birthDate || undefined);
      // Filter out the current person from results
      setDuplicates(dups.filter((d) => d.personId !== personId));
    }, 500);
    return () => clearTimeout(timer);
  }, [form.name, form.birthDate, personId, treeId]);

  const handleMergeClick = async (duplicate: any) => {
    try {
      const details = await getPersonDetails(treeId, duplicate.personId);
      setSelectedDuplicate(details);
      setMergingPersonId(duplicate.personId);
      setShowMergeDialog(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to load duplicate details');
    }
  };

  const handleMergeConfirm = async (fieldsToKeep: Record<string, boolean>) => {
    if (!personId || !mergingPersonId) return;
    setSaving(true);
    setError(null);
    try {
      await mergePerson(treeId, mergingPersonId, personId, fieldsToKeep);
      setNotice('Persons merged successfully.');
      setShowMergeDialog(false);
      setSelectedDuplicate(null);
      setMergingPersonId(null);
      setDuplicates([]);
      onSuccess(personId);
    } catch (e: any) {
      setError(e?.message || 'Failed to merge persons');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!personId) return;
    setSaving(true);
    setError(null);
    try {
      const result = await GenealogyCommandBus.deletePerson({
        treeId,
        personId,
        cascade: cascadeMode,
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to delete person');
        return;
      }
      
      addToast('Person deleted successfully.', 'success', 5000);
      setShowConfirmDelete(false);
      onDeleted();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete person');
    } finally {
      setSaving(false);
    }
  };

  // Relationship analysis for warnings and counts
  const analysis = useMemo(() => {
    const parentOf = new Map<string, Set<string>>();
    const childOf = new Map<string, Set<string>>();
    edges.forEach((e) => {
      if (e.type === 'parent-child') {
        if (!parentOf.has(e.source)) parentOf.set(e.source, new Set());
        parentOf.get(e.source)!.add(e.target);
        if (!childOf.has(e.target)) childOf.set(e.target, new Set());
        childOf.get(e.target)!.add(e.source);
      }
    });

    // descendants count via BFS down
    let descendantsCount = 0;
    if (personId) {
      const queue: string[] = [personId];
      const visited = new Set<string>([personId]);
      while (queue.length) {
        const u = queue.shift()!;
        const kids = parentOf.get(u);
        if (!kids) continue;
        for (const c of kids) {
          if (!visited.has(c)) {
            visited.add(c);
            descendantsCount++;
            queue.push(c);
          }
        }
      }
    }

    // orphaned children count: children with no other parent than current
    let orphanedChildren = 0;
    children.forEach((c) => {
      const parentsSet = childOf.get(c.personId) || new Set<string>();
      const otherParents = Array.from(parentsSet).filter((pid) => pid !== personId);
      if (otherParents.length === 0) orphanedChildren++;
    });

    return {
      descendantsCount,
      orphanedChildren,
      spouseCount: spouses.length,
    };
  }, [edges, children, spouses, personId]);

  return (
    <>
      <div
        className={`offcanvas offcanvas-end ${isOpen ? 'show' : ''}`}
        tabIndex={-1}
        id="editPersonOffcanvas"
        aria-labelledby="editPersonOffcanvasLabel"
        style={{ visibility: isOpen ? 'visible' : 'hidden', maxWidth: '520px', width: '100%' }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title" id="editPersonOffcanvasLabel">Edit Person</h5>
          <button type="button" className="btn-close text-reset" onClick={onClose} aria-label="Close"></button>
        </div>
        <div className="offcanvas-body d-flex flex-column">
          {loading && <div className="text-center text-muted">Loading person…</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {notice && <div className="alert alert-success">{notice}</div>}
          {duplicates.length > 0 && (
            <div className="alert alert-warning p-2 mb-3">
              <strong>⚠️ Possible duplicate detected</strong>
              <p className="mb-2 mt-1">{duplicates.length} similar person(s) found:</p>
              {duplicates.map((dup) => (
                <div key={dup.personId} className="d-flex justify-content-between align-items-center p-2 bg-light rounded mb-1">
                  <span>{dup.displayName} (similarity: {Math.round(dup.similarity * 100)}%)</span>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleMergeClick(dup)}>Merge</button>
                </div>
              ))}
            </div>
          )}
          {!loading && (
            <form
              className="flex-grow-1 d-flex flex-column"
              onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            >
              <div className="flex-grow-1 overflow-y-auto p-3">
                <PersonForm value={form} onChange={setForm} disabled={saving} showPersonId readonlyPersonId />
              </div>
              <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center">
                <button type="button" className="btn btn-outline-danger" onClick={() => setShowConfirmDelete(true)} disabled={saving}>
                  Delete Person
                </button>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
      {isOpen && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}

      {/* Confirmation Modal with cascade options and warnings */}
      {showConfirmDelete && (
        <div className="modal fade show" style={{ display: 'block' }} aria-modal="true" role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
                <button type="button" className="btn-close" onClick={() => setShowConfirmDelete(false)} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <p>Choose how to handle relationships when deleting this person.</p>
                <div className="form-check">
                  <input className="form-check-input" type="radio" name="cascadeOptions" id="cascadePersonOnly" checked={cascadeMode === 'person-only'} onChange={() => setCascadeMode('person-only')} />
                  <label className="form-check-label" htmlFor="cascadePersonOnly">
                    Delete person only (remove links, keep relatives)
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" name="cascadeOptions" id="cascadeWithChildren" checked={cascadeMode === 'with-children'} onChange={() => setCascadeMode('with-children')} />
                  <label className="form-check-label" htmlFor="cascadeWithChildren">
                    Delete with children (recursive descendants)
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" name="cascadeOptions" id="cascadeWithAll" checked={cascadeMode === 'with-all-relationships'} onChange={() => setCascadeMode('with-all-relationships')} />
                  <label className="form-check-label" htmlFor="cascadeWithAll">
                    Delete with all relationships (full removal)
                  </label>
                </div>

                <hr />
                <p className="mb-1"><strong>Affected people preview</strong></p>
                <ul>
                  <li>Person: 1</li>
                  <li>Descendants (if selected): {analysis.descendantsCount}</li>
                </ul>
                {analysis.orphanedChildren > 0 && (
                  <div className="alert alert-warning p-2">
                    <strong>Warning:</strong> {analysis.orphanedChildren} child(ren) will be orphaned.
                  </div>
                )}
                {analysis.spouseCount > 0 && (
                  <div className="alert alert-info p-2">
                    {analysis.spouseCount} marriage relationship(s) will be dissolved.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmDelete(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showConfirmDelete && <div className="modal-backdrop fade show" onClick={() => setShowConfirmDelete(false)}></div>}

      {/* Merge Dialog */}
      <MergeDialog
        open={showMergeDialog}
        currentPerson={form as any}
        duplicatePerson={selectedDuplicate}
        onConfirm={handleMergeConfirm}
        onCancel={() => {
          setShowMergeDialog(false);
          setSelectedDuplicate(null);
          setMergingPersonId(null);
        }}
        loading={saving}
      />
    </>
  );
};

export const EditPersonDrawer = withErrorBoundary(EditPersonDrawerInner);
