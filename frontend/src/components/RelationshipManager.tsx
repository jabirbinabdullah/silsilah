import React, { useEffect, useMemo, useState } from 'react';
import { GenealogyCommandBus } from '../commands/genealogyCommands';
import type { RenderNode, CreatePersonPayload, RenderEdgeData } from '../api';
import { RelationshipTypeSelector, ExtendedRelationshipType } from './RelationshipTypeSelector';
import { PersonSearch } from './PersonSearch';
import { QuickPersonForm } from './QuickPersonForm';

type RelationshipManagerProps = {
  treeId: string;
  open: boolean;
  onClose: () => void;
  nodes: RenderNode[];
  currentPersonId: string;
  onCreated: (focusPersonId: string) => void;
  onCreateSpouse?: (treeId: string, payload: { personAId: string; personBId: string }) => Promise<any>;
  currentParents?: Array<{ personId: string; displayName: string }>;
  currentChildren?: Array<{ personId: string; displayName: string }>;
  currentSpouses?: Array<{ personId: string; displayName: string }>;
  edges?: RenderEdgeData[];
};

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  treeId,
  open,
  onClose,
  nodes,
  currentPersonId,
  onCreated,
  onCreateSpouse,
  currentParents = [],
  currentChildren = [],
  currentSpouses = [],
  edges = [],
}) => {
  const [relationshipType, setRelationshipType] = useState<ExtendedRelationshipType>('parent');
  const [search, setSearch] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [savingExisting, setSavingExisting] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [errorExisting, setErrorExisting] = useState<string | null>(null);
  const [errorNew, setErrorNew] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newPersonId, setNewPersonId] = useState('');
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'MALE' | 'FEMALE' | 'UNKNOWN'>('UNKNOWN');
  const [newBirthDate, setNewBirthDate] = useState<string>('');
  const [newDeathDate, setNewDeathDate] = useState<string>('');

  useEffect(() => {
    if (!open) {
      // reset state when closing
      setRelationshipType('parent');
      setSearch('');
      setSelectedExistingId('');
      setSavingExisting(false);
      setSavingNew(false);
      setErrorExisting(null);
      setErrorNew(null);
      setSuccessMessage(null);
      setNewName('');
      setNewGender('UNKNOWN');
      setNewBirthDate('');
      setNewDeathDate('');
    } else {
      setSuccessMessage(null);
    }
  }, [open]);

  const filteredNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) => n.displayName.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
  }, [search, nodes]);

  const validateExisting = (): string | null => {
    if (!selectedExistingId) return 'Please select a person to relate.';
    if (selectedExistingId === currentPersonId) return 'Cannot relate a person to themselves.';
    return null;
  };

  const validateNew = (): string | null => {
    if (!newPersonId.trim()) return 'Person ID is required.';
    if (!/^[a-zA-Z0-9_-]+$/.test(newPersonId)) return 'Person ID must contain only letters, numbers, dashes, or underscores.';
    if (!newName.trim()) return 'Name is required for new person.';
    if (newBirthDate && newDeathDate) {
      const b = new Date(newBirthDate);
      const d = new Date(newDeathDate);
      if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) return 'Invalid date format.';
      if (d < b) return 'Death date must be after or equal to birth date.';
    }
    return null;
  };

  const linkRelationship = async (otherPersonId: string) => {
    if (relationshipType === 'spouse') {
      if (!onCreateSpouse) throw new Error('Spouse relationship API not available');
      await onCreateSpouse(treeId, { personAId: currentPersonId, personBId: otherPersonId });
      setSuccessMessage('Spouse relationship created successfully.');
      onCreated(currentPersonId);
      return;
    }

    if (relationshipType === 'parent') {
      const result = await GenealogyCommandBus.addParentChildRelationship({
        treeId,
        parentId: otherPersonId,
        childId: currentPersonId,
      });
      if (!result.success) throw new Error(result.error || 'Failed to add parent');
      setSuccessMessage('Parent added successfully.');
      onCreated(currentPersonId);
      return;
    }

    // child
    const result = await GenealogyCommandBus.addParentChildRelationship({
      treeId,
      parentId: currentPersonId,
      childId: otherPersonId,
    });
    if (!result.success) throw new Error(result.error || 'Failed to add child');
    setSuccessMessage('Child added successfully.');
    onCreated(otherPersonId);
  };

  const handleLinkExisting = async () => {
    const v = validateExisting();
    if (v) {
      setErrorExisting(v);
      return;
    }
    setSavingExisting(true);
    setErrorExisting(null);
    try {
      await linkRelationship(selectedExistingId);
    } catch (e: any) {
      setErrorExisting(e?.message || 'Failed to create relationship');
    } finally {
      setSavingExisting(false);
    }
  };

  const handleCreateAndLink = async () => {
    const v = validateNew();
    if (v) {
      setErrorNew(v);
      return;
    }
    setSavingNew(true);
    setErrorNew(null);
    try {
      const payload: CreatePersonPayload = {
        personId: newPersonId.trim(),
        name: newName.trim(),
        gender: newGender,
        birthDate: newBirthDate || null,
        birthPlace: null,
        deathDate: newDeathDate || null,
      };
      const result = await GenealogyCommandBus.addPerson({
        treeId,
        name: payload.name,
        gender: payload.gender,
        birthDate: payload.birthDate,
        birthPlace: payload.birthPlace,
        deathDate: payload.deathDate,
      });
      if (!result.success) throw new Error(result.error || 'Failed to create person');
      await linkRelationship(result.data!.personId);
    } catch (e: any) {
      setErrorNew(e?.message || 'Failed to create and link person');
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <>
      <div
        className={`offcanvas offcanvas-end ${open ? 'show' : ''}`}
        tabIndex={-1}
        id="relationshipManagerOffcanvas"
        aria-labelledby="relationshipManagerOffcanvasLabel"
        style={{ visibility: open ? 'visible' : 'hidden', maxWidth: '720px', width: '100%' }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title" id="relationshipManagerOffcanvasLabel">
            Add Relative for {currentPersonId}
          </h5>
          <button type="button" className="btn-close text-reset" onClick={onClose} aria-label="Close"></button>
        </div>
        <div className="offcanvas-body d-flex flex-column">
          <div className="mb-3">
            <label className="form-label">Relationship Type</label>
            <RelationshipTypeSelector
              currentPersonId={currentPersonId}
              selectedOtherId={selectedExistingId || null}
              parents={currentParents}
              children={currentChildren}
              spouses={currentSpouses}
              edges={edges}
              value={relationshipType}
              onChange={setRelationshipType}
            />
          </div>

          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <div className="row g-3">
            <div className="col-6">
              <div className="card h-100">
                <div className="card-header">Select Existing Person</div>
                <div className="card-body">
                  {errorExisting && <div className="alert alert-danger">{errorExisting}</div>}
                  <PersonSearch
                    nodes={nodes}
                    edges={edges}
                    currentPersonId={currentPersonId}
                    relatedIds={{
                      parents: new Set(currentParents.map((p) => p.personId)),
                      children: new Set(currentChildren.map((c) => c.personId)),
                      spouses: new Set(currentSpouses.map((s) => s.personId)),
                    }}
                    onSelect={(pid) => setSelectedExistingId(pid)}
                    onCreateNew={() => { /* focus right panel form */ }}
                    height={280}
                  />
                  <div className="mt-2 d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={handleLinkExisting} disabled={savingExisting || !selectedExistingId}>
                      {savingExisting ? 'Linking…' : 'Link Selected'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-6">
              <div className="card h-100">
                <div className="card-header">Create New Person</div>
                <div className="card-body">
                  <QuickPersonForm
                    onSubmit={async (payload) => {
                      setErrorNew(null);
                      setSavingNew(true);
                      try {
                        const result = await GenealogyCommandBus.addPerson({
                          treeId,
                          name: payload.name,
                          gender: payload.gender,
                          birthDate: payload.birthDate,
                          birthPlace: payload.birthPlace,
                          deathDate: payload.deathDate,
                        });
                        if (!result.success) throw new Error(result.error || 'Failed to create person');
                        await linkRelationship(result.data!.personId);
                      } catch (e: any) {
                        setErrorNew(e?.message || 'Failed to create and link person');
                      } finally {
                        setSavingNew(false);
                      }
                    }}
                    loading={savingNew}
                    error={errorNew}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {open && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}
    </>
  );
};