import React, { useEffect, useState } from 'react';
import { PersonDetails, formatDate, formatGender, getPersonDetails } from '../api';
import { FamilyNode, PersonRelationships } from './PersonRelationships';

type PersonDetailsDrawerProps = {
  treeId: string;
  personId: string | null;
  parents: FamilyNode[];
  children: FamilyNode[];
  spouses: FamilyNode[];
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
};

export const PersonDetailsDrawer: React.FC<PersonDetailsDrawerProps> = ({
  treeId,
  personId,
  parents,
  children,
  spouses,
  onClose,
  onSelectPerson,
}: PersonDetailsDrawerProps) => {
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = personId !== null;

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
          <button
            type="button"
            className="btn-close text-reset"
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body">
          {loading && <div className="text-center text-muted">Loading Details...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
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
                <h6 className="text-muted">Family</h6>
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
      </div>
      {isOpen && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}
    </>
  );
};
