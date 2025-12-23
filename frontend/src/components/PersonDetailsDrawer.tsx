import React, { useEffect, useState } from 'react';
import { PersonDetails, formatDate, formatGender, getPersonDetails } from '../api';

export type RelationshipCounts = {
  parents: number;
  children: number;
  spouses: number;
};

type PersonDetailsDrawerProps = {
  treeId: string;
  personId: string | null;
  relationshipCounts: RelationshipCounts;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
};

export const PersonDetailsDrawer: React.FC<PersonDetailsDrawerProps> = ({
  treeId,
  personId,
  relationshipCounts,
  onClose,
  onSelectPerson,
}) => {
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) {
      setPerson(null);
      return;
    }

    setLoading(true);
    setError(null);

    getPersonDetails(treeId, personId)
      .then(setPerson)
      .catch((err) => {
        setError(err.message || 'Failed to load person details');
        setPerson(null);
      })
      .finally(() => setLoading(false));
  }, [treeId, personId]);

  if (!personId) return null;

  return (
    <div
      className="fixed right-0 top-0 h-screen w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 z-50"
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold truncate text-gray-900">{person?.name || 'Loading...'}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

        {loading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : person ? (
          <>
            {/* Relationship Counts */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{relationshipCounts.parents}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Parent{relationshipCounts.parents !== 1 ? 's' : ''}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{relationshipCounts.children}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Child{relationshipCounts.children !== 1 ? 'ren' : ''}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{relationshipCounts.spouses}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Spouse{relationshipCounts.spouses !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Gender */}
              {person.gender && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Gender</label>
                  <p className="text-sm text-gray-800 mt-1">{formatGender(person.gender)}</p>
                </div>
              )}

              {/* Birth Date */}
              {person.birthDate && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Birth</label>
                  <p className="text-sm text-gray-800 mt-1">
                    {formatDate(person.birthDate)}
                    {person.birthPlace && ` in ${person.birthPlace}`}
                  </p>
                </div>
              )}

              {/* Death Date */}
              {person.deathDate && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Death</label>
                  <p className="text-sm text-gray-800 mt-1">{formatDate(person.deathDate)}</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
