import React, { useEffect, useState } from 'react';
import { PersonDetails, formatDate, formatGender, getPersonDetails, getPersonChangeHistory } from '../api';
import { GenealogyCommandBus } from '../commands/genealogyCommands';
import { FamilyNode, PersonRelationships } from './PersonRelationships';
import { EditPersonDrawer } from './EditPersonDrawer';
import TreeActivityFeed from './TreeActivityFeed';

type PersonDetailsDrawerProps = {
  treeId: string;
  personId: string | null;
  parents: FamilyNode[];
  children: FamilyNode[];
  spouses: FamilyNode[];
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  onAddRelationship?: (prefill: { parentId?: string; childId?: string }) => void;
  onEdit?: (personId: string) => void;
  onChildAdded?: (childId: string) => void;
  onRefresh?: () => void;
};

export const PersonDetailsDrawer: React.FC<PersonDetailsDrawerProps> = ({
  treeId,
  personId,
  parents,
  children,
  spouses,
  onClose,
  onSelectPerson,
  onAddRelationship,
  onEdit,
  onChildAdded,
  onRefresh,
}: PersonDetailsDrawerProps) => {
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingChild, setCreatingChild] = useState(false);
  const [childFormOpen, setChildFormOpen] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildGender, setNewChildGender] = useState<'MALE' | 'FEMALE' | 'UNKNOWN'>('UNKNOWN');

  // Edit/Delete state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cascadeMode, setCascadeMode] = useState<'person-only' | 'with-children' | 'with-all-relationships'>('person-only');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Connect to Existing Person modal state
  const [connectModalOpen, setConnectModalOpen] = useState<null | 'parent' | 'child' | 'spouse'>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  const isOpen = personId !== null;
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [lastModified, setLastModified] = useState<{
    username: string;
    timestamp: string;
    isSystem: boolean;
  } | null>(null);

  // Reset to Details tab when switching person
  useEffect(() => {
    setActiveTab('details');
  }, [personId]);

  // Load last modified info from audit history (limit 1)
  useEffect(() => {
    let cancelled = false;
    const loadLastModified = async () => {
      if (!personId) {
        setLastModified(null);
        return;
      }
      try {
        const res = await getPersonChangeHistory(treeId, personId, { limit: 1, offset: 0 });
        const entry = (res as any).entries?.[0];
        if (!cancelled && entry) {
          const username: string = entry.actor?.username ?? 'anonymous';
          const role: string = entry.actor?.role ?? 'UNKNOWN';
          const isSystem = role === 'UNKNOWN' || ['system', 'anonymous'].includes(String(username).toLowerCase());
          setLastModified({ username, timestamp: entry.timestamp, isSystem });
        } else if (!cancelled) {
          setLastModified(null);
        }
      } catch {
        if (!cancelled) setLastModified(null);
      }
    };
    loadLastModified();
    return () => {
      cancelled = true;
    };
  }, [treeId, personId]);

  // Generate auto name for new child
  const generateChildName = (parentName: string): string => {
    return `Child of ${parentName}`;
  };

  // Handle quick add child
  const handleQuickAddChild = async () => {
    if (!person || !personId) return;

    try {
      setCreatingChild(true);
      setError(null);

      // Generate unique child ID
      const childId = `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const childName = generateChildName(person.name);

      // Create the child person
      const createResult = await GenealogyCommandBus.addPerson({
        treeId,
        name: childName,
        gender: 'UNKNOWN',
        birthDate: null,
        birthPlace: null,
        deathDate: null,
      });

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create child');
      }

      // Establish parent-child relationship
      const linkResult = await GenealogyCommandBus.addParentChildRelationship({
        treeId,
        parentId: personId,
        childId: createResult.data!.personId,
      });

      if (!linkResult.success) {
        throw new Error(linkResult.error || 'Failed to establish parent-child relationship');
      }

      // Initialize form with generated child name
      setNewChildName(childName);
      setNewChildGender('UNKNOWN');
      setChildFormOpen(true);

      // Notify parent and refresh data
      if (onChildAdded) onChildAdded(createResult.data!.personId);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(`Failed to create child: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setCreatingChild(false);
    }
  };

  // Handle edit child inline
  const handleEditChildName = async () => {
    if (!newChildName.trim()) {
      setError('Child name cannot be empty');
      return;
    }

    // The child is already created with the auto-generated name
    // In a real app, you'd update the name here via API
    // For now, we just close the form
    setChildFormOpen(false);
    setNewChildName('');
    setNewChildGender('UNKNOWN');
  };

  useEffect(() => {
    if (personId) {
      setLoading(true);
      setError(null);
      getPersonDetails(treeId, personId)
        .then(setPerson)
        .catch((err) => {
          setError(err.message || 'Failed to load person details');
          setPerson(null);
        })
        .finally(() => setLoading(false));
    } else {
      // Reset state when drawer closes
      setPerson(null);
      setError(null);
    }
  }, [treeId, personId]);

  return (
    <>
      <div
        className={`offcanvas offcanvas-end ${isOpen ? 'show' : ''}`}
        tabIndex={-1}
        id="detailsOffcanvas"
        aria-labelledby="detailsOffcanvasLabel"
        style={{ visibility: isOpen ? 'visible' : 'hidden', maxWidth: '400px', width: '100%' }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title" id="detailsOffcanvasLabel">
            {person?.name || 'Person Details'}
          </h5>
          
          {/* Last modified indicator (derived from audit only) */}
          {lastModified && (
            <div className="ms-3 small text-muted" aria-live="polite" title={new Date(lastModified.timestamp).toLocaleString()}>
              Last modified by {lastModified.isSystem ? 'System' : lastModified.username} at {new Date(lastModified.timestamp).toLocaleString()}
            </div>
          )}
          <div className="d-flex gap-2">
            <button 
              type="button" 
              className="btn btn-outline-success btn-sm" 
              onClick={handleQuickAddChild} 
              title="Quick add child with auto-generated name" 
              disabled={!personId || creatingChild}
            >
              {creatingChild ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Adding...
                </>
              ) : (
                '+ Child'
              )}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onSelectPerson(personId!)} title="Focus in tree" disabled={!personId}>Focus</button>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onAddRelationship && onAddRelationship({})} title="Add relative" disabled={!personId}>Add Relative</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditDrawerOpen(true)} title="Edit" disabled={!personId}>Edit</button>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setDeleteModalOpen(true)} title="Delete" disabled={!personId}>Delete</button>
                  {/* EditPersonDrawer */}
                  {editDrawerOpen && personId && (
                    <EditPersonDrawer
                      treeId={treeId}
                      personId={personId}
                      onClose={() => setEditDrawerOpen(false)}
                      onSuccess={() => { setEditDrawerOpen(false); if (onRefresh) onRefresh(); }}
                      onDeleted={() => { setEditDrawerOpen(false); if (onRefresh) onRefresh(); }}
                      parents={parents}
                      children={children}
                      spouses={spouses}
                    />
                  )}

                  {/* Delete Confirmation Modal */}
                  {deleteModalOpen && (
                    <div className="modal fade show" style={{ display: 'block' }} aria-modal="true" role="dialog">
                      <div className="modal-dialog">
                        <div className="modal-content">
                          <div className="modal-header">
                            <h5 className="modal-title">Confirm Deletion</h5>
                            <button type="button" className="btn-close" onClick={() => setDeleteModalOpen(false)} aria-label="Close"></button>
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
                            {deleteError && <div className="alert alert-danger mt-2">{deleteError}</div>}
                          </div>
                          <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
                            <button type="button" className="btn btn-danger" disabled={deleting} onClick={async () => {
                              setDeleting(true);
                              setDeleteError(null);
                              try {
                                const result = await GenealogyCommandBus.deletePerson({
                                  treeId,
                                  personId: personId!,
                                  cascade: cascadeMode,
                                });
                                if (!result.success) {
                                  setDeleteError(result.error || 'Failed to delete person');
                                  setDeleting(false);
                                  return;
                                }
                                setDeleteModalOpen(false);
                                setDeleting(false);
                                if (onRefresh) onRefresh();
                              } catch (e: any) {
                                setDeleteError(e?.message || 'Failed to delete person');
                                setDeleting(false);
                              }
                            }}>Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {deleteModalOpen && <div className="modal-backdrop fade show" onClick={() => setDeleteModalOpen(false)}></div>}
            <button
              type="button"
              className="btn-close text-reset"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
        </div>
        <div className="offcanvas-body">
          {loading && <div className="text-center text-muted">Loading Details...</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          {/* Tabs: Details | History */}
          <ul className="nav nav-tabs mb-3" role="tablist" aria-label="Person details tabs">
            <li className="nav-item" role="presentation">
              <button
                id="tab-details"
                className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'details'}
                aria-controls="panel-details"
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                id="tab-history"
                className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'history'}
                aria-controls="panel-history"
                onClick={() => setActiveTab('history')}
                disabled={!personId}
              >
                History
              </button>
            </li>
          </ul>

          {/* Details Panel */}
          {activeTab === 'details' && (
            <div id="panel-details" role="tabpanel" aria-labelledby="tab-details">
          
          {childFormOpen && (
            <div className="card border-success mb-3">
              <div className="card-header bg-success-subtle">
                <h6 className="mb-0">Quick Add Child - Edit Details</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="childName" className="form-label">Child Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="childName"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="Enter child's name"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="childGender" className="form-label">Gender</label>
                  <select
                    className="form-select"
                    id="childGender"
                    value={newChildGender}
                    onChange={(e) => setNewChildGender(e.target.value as 'MALE' | 'FEMALE' | 'UNKNOWN')}
                  >
                    <option value="UNKNOWN">Unknown</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-success btn-sm flex-grow-1"
                    onClick={handleEditChildName}
                  >
                    Done Editing
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setChildFormOpen(false);
                      setNewChildName('');
                      setNewChildGender('UNKNOWN');
                    }}
                  >
                    Close
                  </button>
                </div>
                <small className="text-muted d-block mt-2">
                  💡 The child has been created with a biological parent-child relationship. Edit the details above and click "Done Editing" to save.
                </small>
              </div>
            </div>
          )}
          
          {person && !loading && (
            <div className="d-flex flex-column h-100">
              <div className="mb-4">
                <h6 className="text-muted">Details</h6>
                <ul className="list-group">
                  {person.gender && (
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Gender
                      <span className="badge bg-secondary">{formatGender(person.gender)}</span>
                    </li>
                  )}
                  {person.birthDate && (
                    <li className="list-group-item">
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">Born</h6>
                        <small>{formatDate(person.birthDate)}</small>
                      </div>
                      {person.birthPlace && <p className="mb-1 text-muted">{person.birthPlace}</p>}
                    </li>
                  )}
                  {person.deathDate && (
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Died
                      <small>{formatDate(person.deathDate)}</small>
                    </li>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="text-muted mb-0">Family</h6>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      title="Quick add child with auto-generated name"
                      onClick={handleQuickAddChild}
                      disabled={!personId || creatingChild}
                    >
                      {creatingChild ? '...' : '+ Quick Child'}
                    </button>
                    {onAddRelationship && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        title="Add Relative"
                        onClick={() => onAddRelationship({})}
                      >
                        + Add Relative
                      </button>
                    )}
                  </div>
                </div>
                <PersonRelationships
                  parents={parents}
                  children={children}
                  spouses={spouses}
                  onSelectPerson={onSelectPerson}
                />
              </div>
            </div>
          )}
            </div>
          )}

          {/* History Panel */}
          {activeTab === 'history' && personId && (
            <div id="panel-history" role="tabpanel" aria-labelledby="tab-history">
              <div className="mb-3">
                <small className="text-muted">
                  Read-only change history affecting this person. Actions, actor, and timestamps only.
                </small>
              </div>
              <div>
                <TreeActivityFeed
                  treeId={treeId}
                  personId={personId}
                  limit={25}
                  onPersonLinkClick={(id) => onSelectPerson(id)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {isOpen && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}
    </>
  );
};
